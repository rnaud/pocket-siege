import { test, expect } from "./helpers/shared-page.js";
import { startMatch } from "./helpers/match.js";
import fixture from "./fixtures/armageddon/kamikaze.json" with { type: "json" };
import elimination from "../src/armageddon/elimination-announcements.json" with { type: "json" };
import { nextLogicRandom, nextVisualRandom } from "../src/armageddon/numeric.js";
import { nativeWormDeathAnnouncement } from "../src/armageddon/announcements.js";
import { nativeKamikazeStart, nativeKamikazeTick } from "../src/armageddon/kamikaze.js";

const record = { "0x70": 500, "0x74": 30, "0x78": 95, "0x7c": 30, "0x80": 100, "0x84": 30 };
const strip = (calls) => calls.map(({ table, ...call }) => call);

test("kamikaze start matches the original state 0x6D entry", { tag: "@logic" }, () => {
  expect(fixture.starts).toHaveLength(312);
  for (const { input, result } of fixture.starts) {
    const start = nativeKamikazeStart(record, input, input);
    expect(start.calls).toEqual(result.calls);
    expect([start.body.dig, start.flag]).toEqual([result.dig, result.flag]);
  }
});

test("kamikaze frame matches the original state 0x6D frame", { tag: "@logic" }, () => {
  expect(fixture.ticks.length).toBeGreaterThan(1000);
  for (const { input, result } of fixture.ticks) {
    let seed = input.seed;
    const tick = nativeKamikazeTick(record, { dig: input.dig, x: input.x, y: input.y }, input,
      { water: input.water }, { test: () => input.solid, random: () => (seed = nextVisualRandom(seed)) });
    expect(tick.calls).toEqual(strip(result.calls));
    expect([tick.result, tick.body.dig, seed >>> 0]).toEqual([result.returned, result.dig, result.seed]);
  }
});

test("whole kamikaze flights match the original", { tag: "@logic" }, () => {
  // Terrain is solid below y=500 px and right of x=1500 px in the capture.
  const solid = (size, x, y) => y >= 500 || x >= 1500;
  expect(fixture.flights).toHaveLength(30);
  for (const flight of fixture.flights) {
    const worm = { aim: flight.aim, facing: flight.facing, total: 0, health: 60, marked: 0 };
    let { body } = nativeKamikazeStart({ ...record, "0x70": flight.dig }, { ...worm, x: 0x3201234, y: 0x1009876 });
    let seed = 99;
    for (const frame of flight.frames) {
      const tick = nativeKamikazeTick(record, body, worm, { water: 650 },
        { test: solid, random: () => (seed = nextVisualRandom(seed)) });
      expect(tick.calls).toEqual(strip(frame.calls));
      expect([tick.result, tick.body.dig]).toEqual([frame.returned, frame.dig]);
      body = tick.body;
    }
  }
});

test("the kamikaze worm's farewell uses the original death table", { tag: "@logic" }, () => {
  expect(fixture.messages).toEqual(elimination.death);
  expect(fixture.table).toBe(Number.parseInt(elimination.deathTable, 16));
  for (const row of fixture.announcements) {
    let random = row.seed;
    const message = nativeWormDeathAnnouncement("Boggy B", row.color, false, () => (random = nextLogicRandom(random, row.frame)));
    expect([{ operation: "message", ...message }]).toEqual(row.result.calls);
    expect(random >>> 0).toBe(row.result.random);
  }
});

// One live Kamikaze: fire, let the turn run, report the flight.
async function flyKamikaze(page, aim, stage = false) {
  return page.evaluate(({ aim, stage }) => {
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: " ", code: "Space", bubbles: true }));
    window.siege.debug.advanceReplayFrames(30);
    const staged = stage ? window.siege.debug.stageMeleeTargets() : null;
    window.siege.debug.setAmmo(0, "kamikaze", 9);
    window.siege.debug.setWeapon("kamikaze");
    window.siege.debug.setNativeAim(aim);
    window.siege.debug.advanceReplayFrames(30);
    const start = window.siege.getState(), index = start.current, team = start.team;
    const states = new Set(), path = [];
    key("keydown");
    let s = start;
    for (let i = 0; i < 1500 && s.team === team && s.phase !== "over"; i++) {
      window.siege.debug.advanceReplayFrames(1);
      if (i === 2) key("keyup");
      s = window.siege.getState();
      const w = s.worms[index];
      states.add(w.nativeState);
      // Hit-stop frames pause the simulation; keep one entry per flight frame.
      const last = path.at(-1);
      if (w.nativeState === 0x6d && (!last || last[0] !== w.x || last[1] !== w.y)) path.push([w.x, w.y]);
    }
    return { start: start.worms[index], worm: s.worms[index], states: [...states], path, team: s.team,
      graves: s.graves.length, hps: s.worms.map((w) => w.hp), before: start.worms.map((w) => w.hp),
      ammo: s.ammo[0].kamikaze, waterY: s.waterLevel, staged,
      facing: Math.sign(path.at(-1)[0] - path[0][0]) };
  }, { aim, stage });
}

test("kamikaze flies straight along its aim and explodes off the map", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  // Aim up and to the right: 0xC000 snaps to the diagonal.
  const flight = await flyKamikaze(page, 0xc000);
  expect(errors).toEqual([]);
  expect(flight.ammo).toBe(8);
  expect(flight.states).toContain(0x6d);
  // 16 px a frame scaled by 3/5 on a diagonal (9.6 px), from a whole pixel
  // each frame: 9 or 10 px on each axis, up and toward the facing side.
  for (let i = 1; i < flight.path.length; i++) {
    const dx = (flight.path[i][0] - flight.path[i - 1][0]) * flight.facing;
    const dy = flight.path[i][1] - flight.path[i - 1][1];
    expect([9, 10]).toContain(Math.round(dx));
    expect([9, 10]).toContain(Math.round(dy));
  }
  expect(flight.worm.hp).toBe(0);
  expect(flight.graves).toBe(0);
  expect(flight.team).not.toBe(0);
});

test("kamikaze tunnels straight down and drowns at the water line", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  const flight = await flyKamikaze(page, 0);
  expect(errors).toEqual([]);
  // Straight down, 16 px a frame, digging through the island.
  for (let i = 1; i < flight.path.length; i++) {
    expect(flight.path[i][0]).toBe(flight.path[0][0]);
    expect(Math.round(flight.path[i - 1][1] - flight.path[i][1])).toBe(16);
  }
  // Reaching water + 8 hands the worm to drowning (0x87) instead of exploding.
  expect(flight.path.at(-1)[1]).toBeGreaterThan(flight.waterY - 8);
  expect(flight.path.at(-1)[1] - 16).toBeLessThanOrEqual(flight.waterY - 8);
  expect(flight.worm.nativeState).toBe(0x87);
  expect(flight.worm.hp).toBe(0);
  expect(flight.team).not.toBe(0);
});

test("kamikaze rams worms in its path and explodes on the ground", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  // Shooter at x 400 facing right, ally at 420, enemy at 440, another worm behind at 380.
  const flight = await flyKamikaze(page, 0x8000, true);
  expect(errors).toEqual([]);
  const { shooter, ally, enemy, rear } = flight.staged;
  expect(flight.facing).toBe(1);
  for (const [x, y] of flight.path) expect(Math.round(y)).toBe(Math.round(flight.path[0][1]));
  // 004F7DA0 rams each worm in the 24 px box once: 30 damage plus the push.
  expect(flight.hps[ally]).toBeLessThanOrEqual(70);
  expect(flight.hps[enemy]).toBeLessThanOrEqual(70);
  expect(flight.hps[ally]).toBeGreaterThan(0);
  expect(flight.hps[rear]).toBe(100);
  expect(flight.hps[shooter]).toBe(0);
  expect(flight.graves).toBe(0);
});
