import { test, expect } from "./helpers/shared-page.js";
import { createLiveAi, stepLiveAi, destroyLiveAi, liveAiPlan } from "../src/armageddon/cpu-ai-live.js";
import { nativeWalkPosition } from "../src/armageddon/walking-motion.js";

// A small synthetic scene: ground surface heights[x] (native y-down), a 9x13
// worm box, the AI worm (team 2) on a plateau and one enemy (team 1). A
// minimal host applies the AI's controller events the way main.js does.
const W = 1920, H = 700, WATER = 680;
function scene() {
  const heights = Array.from({ length: W }, (_, x) => (x < 200 ? 560 : x < 420 ? 600 - Math.max(0, x - 380) : 640));
  const solid = (x, y) => (x < 0 || x >= W || y >= heights[x] ? 1 : 0);
  const box = (x, y) => {
    const cx = x >> 16, cy = y >> 16;
    if (cx - 4 < 0 || cx + 4 >= W) return 1;
    for (let i = cx - 4; i <= cx + 4; i++) if (heights[i] <= cy + 6) return 1;
    return 0;
  };
  const standY = (x) => {
    let y = 0;
    while (!box(x << 16, (y + 1) << 16)) y++;
    return y << 16;
  };
  return { heights, solid, box, standY };
}

function run({ frames = 4000, seed = 0x1234567, skill = 100 } = {}) {
  const s = scene();
  const me = { x: 300 << 16, y: s.standY(300), facing: -1 };
  const enemy = { x: 900 << 16, y: s.standY(900) };
  const ammo = { 1: -1, 6: 3, 11: 1 };
  const host = {
    frame: 0, logic: { seed, frame: 0 }, selected: 0, aim: 0xc000, charging: 0, charge: 0, canAttack: 1,
    walked: 0, walkedPrev: 0, falling: 0, fired: null, retreat: 0, ended: false, turnLeft: 45000, fuse: 0, shots: [],
  };
  const adapter = {
    team: 2, skill, aggression: 0, seed, livingWorms: 1,
    snapshot: () => ({
      currentWorm: 1,
      controls: [host.ended ? 1 : 0, 1, 0, host.canAttack, host.selected, 0],
      root: { team: 2, turnLeftMs: host.turnLeft, matchMs: host.frame * 20, suddenDeath: 0, ended: 0 },
      worm: { state: host.falling ? 0x7c : host.charging ? 0x68 : host.walkedPrev ? 0x66 : host.canAttack ? 0x67 : 0x65,
        aim: host.aim, charge: host.charge, weapon: 0 },
      position: [me.x, me.y], moving: 0,
      worms: [{ team: 2, worm: 1, x: me.x, y: me.y, hp: 100, alliance: 2, self: true },
        { team: 1, worm: 1, x: enemy.x, y: enemy.y, hp: 100, alliance: 1, self: false }],
      objects: [], flames: [], water: WATER, waterRise: 0, wind: 0, gravity: 0x3d70, settling: 0,
      closedTop: 0, bordered: 0,
    }),
    collide: (x, y) => s.box(x, y),
    solid: (x, y) => s.solid(x, y),
    ammo: (slot) => ammo[slot] ?? 0,
    logicRandom: () => {
      host.logic.seed = (Math.imul((host.logic.seed + host.logic.frame) | 0, 0x19660d) + 0x3c6ef35f) | 0;
      return host.logic.seed;
    },
    place: (x, y) => { me.x = x; me.y = y; },
  };
  const ai = createLiveAi(adapter);
  const log = [];
  const walk = (dir) => {
    const step = nativeWalkPosition(me.x, me.y, dir << 16, 8, s.box);
    if (step.result === 1) { me.x = step.x; me.y = step.y; host.walked = 1; }
    me.facing = dir;
  };
  for (; host.frame < frames && !host.ended && !ai.finished; host.frame++) {
    host.logic.frame = host.frame;
    host.walkedPrev = host.walked;
    host.walked = 0;
    // Unsupported worms fall up to 8 pixels per frame and are not idle meanwhile.
    host.falling = 0;
    for (let i = 0; i < 8 && !s.box(me.x, me.y + 0x10000); i++) { me.y += 0x10000; host.falling = 1; }
    if (host.charging) host.charge = Math.min(0x10000, host.charge + 0x369);
    if (host.retreat > 0 && --host.retreat === 0) host.ended = true;
    if (host.canAttack) host.turnLeft -= 20;
    const events = stepLiveAi(ai);
    for (const [event, words] of events) {
      log.push([host.frame, event, ...words.slice(1)]);
      if (event === 0x406 || event === 0x407) walk(event === 0x406 ? -1 : 1);
      else if (event === 0x40a || event === 0x40b) me.facing = event === 0x40a ? -1 : 1;
      else if (event === 0x408) host.aim = Math.min(0x10000, host.aim + 0x200);
      else if (event === 0x409) host.aim = Math.max(0, host.aim - 0x200);
      else if (event === 0x41b) host.selected = words[2];
      else if (event === 0x417) host.fuse = words[2] + 1;
      else if (event === 0x40e && host.canAttack) {
        if (host.selected === 11) { host.shots.push({ slot: 11, aim: host.aim, facing: me.facing, frame: host.frame }); host.canAttack = 0; host.retreat = 250; }
        else { host.charging = 1; host.charge = 0; }
      } else if (event === 0x40f && host.charging) {
        host.shots.push({ slot: host.selected, aim: host.aim, power: host.charge, facing: me.facing, fuse: host.fuse,
          x: me.x, frame: host.frame });
        host.charging = 0; host.charge = 0; host.canAttack = 0; host.retreat = 250;
      } else if (event === 0x410) host.ended = true;
    }
  }
  const plan = liveAiPlan(ai);
  destroyLiveAi(ai);
  return { log, shots: host.shots, plan, frames: host.frame, startX: 300, me };
}

test("composed original AI plans, aims, charges and fires in a synthetic scene", { tag: "@logic" }, () => {
  const a = run();
  const b = run();
  // Deterministic for the same seed and scene.
  expect(a.log).toEqual(b.log);
  expect(a.shots).toEqual(b.shots);
  const events = a.log.map((e) => e[1]);
  // Exactly one shot, preceded by its selection and followed by fire up.
  expect(a.shots.length).toBe(1);
  const shot = a.shots[0];
  const select = a.log.findIndex((e) => e[1] === 0x41b);
  expect(select).toBeGreaterThanOrEqual(0);
  const fireDown = events.indexOf(0x40e), fireUp = events.indexOf(0x40f);
  expect(select).toBeLessThan(fireDown);
  expect(a.log[select][3]).toBe(shot.slot);
  if (shot.slot !== 11) {
    expect(fireDown).toBeLessThan(fireUp);
    // 004F3250 releases exactly at the jittered, quantized power.
    expect(shot.power % 0x369).toBe(0);
    expect(shot.power).toBeGreaterThanOrEqual(0x17df);
    expect(a.plan.power).toBe(shot.power);
  }
  // Aim steps are single 0x200 events and land on the planned aim.
  expect(shot.aim % 0x200).toBe(0);
  const aimEvents = a.log.filter((e) => e[0] < a.log[fireDown][0] && (e[1] === 0x408 || e[1] === 0x409));
  expect(aimEvents.length).toBe(Math.abs(shot.aim - 0xc000) / 0x200);
  expect([1, 6, 11]).toContain(shot.slot);
  // Walk events, if any, all happen before aiming, one per frame.
  const walks = a.log.filter((e) => (e[1] === 0x406 || e[1] === 0x407) && e[0] < a.log[fireDown][0]);
  const frames = new Set(walks.map((e) => e[0]));
  expect(frames.size).toBe(walks.length);
  // The turn ends with the AI's retreat walk and/or its skip (0x410), not the host timer.
  expect(a.frames).toBeLessThan(4000);
});

test("composed AI walks to its chosen launch spot before shooting", { tag: "@logic" }, () => {
  let walked = null;
  for (const seed of [0x1234567, 7, 99, 0x5eed, 31337, 4242]) {
    const r = run({ seed });
    const fire = r.log.findIndex((e) => e[1] === 0x40e || e[1] === 0x40f);
    if (fire < 0) continue;
    const walks = r.log.slice(0, fire).filter((e) => e[1] === 0x406 || e[1] === 0x407);
    if (walks.length && r.shots.length) { walked = { seed, walks: walks.length, x: r.shots[0].x >> 16 }; break; }
  }
  expect(walked, "one of the seeds plans from a reachable spot away from the start").not.toBeNull();
  expect(Math.abs(walked.x - 300)).toBeGreaterThan(3);
});

test("composed AI yields during searches as held frames", { tag: "@logic" }, () => {
  const s = run({ frames: 200 });
  // The first think steps are the 10-frame pause and the 50-frame 0x402 wait; the
  // flood fill and search yield, so nothing fires within the first 60 frames.
  expect(s.log.filter((e) => e[0] < 60 && (e[1] === 0x40e || e[1] === 0x40f)).length).toBe(0);
});
