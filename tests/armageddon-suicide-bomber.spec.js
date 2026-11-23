import { test, expect } from "./helpers/shared-page.js";
import { startMatch } from "./helpers/match.js";
import fixture from "./fixtures/armageddon/suicide-bomber.json" with { type: "json" };
import { nextLogicRandom } from "../src/armageddon/numeric.js";
import {
  nativeSuicideBomberStart, nativeSuicideBomberTick, nativeGasCloud, nativeGasCloudTick, nativeGasCloudDraw,
} from "../src/armageddon/suicide-bomber.js";

const record = { "0x70": 5, "0x74": 30 };

test("suicide bomber matches the original state 0x75", { tag: "@logic" }, () => {
  expect(fixture.entries).toEqual([nativeSuicideBomberStart()]);
  expect(fixture.frames).toHaveLength(75);
  for (const { input, result } of fixture.frames) {
    let random = input.seed;
    const tick = nativeSuicideBomberTick(record, input, () => (random = nextLogicRandom(random, input.frame)));
    expect(tick.calls).toEqual(result.calls);
    expect([tick.result, random >>> 0]).toEqual([result.returned, result.random]);
  }
});

test("poison gas clouds match the original task", { tag: "@logic" }, () => {
  for (const { input, result } of fixture.creates) {
    let random = input.seed;
    const body = nativeGasCloud(input.x, input.y, input.amount, () => (random = nextLogicRandom(random, input.frame)), input.frame);
    expect(body).toEqual(result.body);
    expect(random >>> 0).toBe(result.random);
  }
  expect(fixture.ticks).toHaveLength(144);
  for (const { input, result } of fixture.ticks) {
    const { wind, frame, seed, ...body } = input;
    let random = seed;
    const tick = nativeGasCloudTick(body, { wind, frame, targets: fixture.objects,
      random: () => (random = nextLogicRandom(random, frame)) });
    expect(tick.body).toEqual(result.body);
    expect(tick.calls).toEqual(result.calls);
    expect(tick.busy).toBe(result.busy);
    expect(random >>> 0).toBe(result.random);
    expect([{ operation: "draw", request: nativeGasCloudDraw(tick.body) }]).toEqual(result.draw);
  }
});

test("suicide bomber blows up after its animation and leaves rising poison gas", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  const result = await page.evaluate(() => {
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: " ", code: "Space", bubbles: true }));
    window.siege.debug.advanceReplayFrames(30);
    // Shooter at x 400, ally at 420, enemy at 440, another worm at 380.
    const staged = window.siege.debug.stageMeleeTargets();
    window.siege.debug.setAmmo(0, "suicidebomber", 9);
    window.siege.debug.setWeapon("suicidebomber");
    window.siege.debug.advanceReplayFrames(5);
    const team = window.siege.getState().team;
    key("keydown");
    let held = 0, clouds = 0, poisoned = [], s, first = null, rise = 0, cloudsAtTurnEnd = 0;
    for (let i = 0; i < 1500; i++) {
      window.siege.debug.advanceReplayFrames(1);
      if (i === 2) key("keyup");
      s = window.siege.getState();
      if (s.worms[staged.shooter].nativeState === 0x75) held++;
      clouds = Math.max(clouds, s.gasClouds.length);
      if (s.gasClouds.length) {
        first ??= s.gasClouds.map((c) => c.y);
        rise = Math.max(rise, Math.min(...s.gasClouds.map((c) => c.y)) - Math.max(...first));
      }
      cloudsAtTurnEnd = s.gasClouds.length;
      poisoned = s.worms.map((w, i) => Math.max(poisoned[i] ?? 0, w.nativePoison?.amount ?? 0));
      if (s.team !== team && clouds) break;
    }
    return { rise, cloudsAtTurnEnd, staged, held, clouds, poisoned, hp: s.worms.map((w) => w.hp), graves: s.graves.length,
      team: s.team, before: team, ammo: s.ammo[0].suicidebomber };
  });
  expect(errors).toEqual([]);
  expect(result.ammo).toBe(8);
  // State 0x75 waits for the wkambmr animation before exploding.
  expect(result.held).toBeGreaterThan(10);
  expect(result.clouds).toBe(20);
  const { shooter, ally, enemy } = result.staged;
  expect(result.hp[shooter]).toBe(0);
  expect(result.graves).toBe(0);
  expect(result.hp[ally]).toBeLessThan(100);
  expect(result.hp[enemy]).toBeLessThan(100);
  // The clouds rise (lift -0x2666) and keep the scene busy (50) until they fade.
  expect(result.rise).toBeGreaterThan(20);
  expect(result.cloudsAtTurnEnd).toBe(0);
  expect(result.team).not.toBe(result.before);
});
