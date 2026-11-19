import { test, expect } from "@playwright/test";
import { nativeArmageddonStart, nativeArmageddonTick } from "../src/armageddon/armageddon.js";
import { nativeWeaponSlotBlock } from "../src/armageddon/projectile-runtime.js";

test("armageddon meteors follow the original 004EB110 timer and launch record", { tag: "@logic" }, () => {
  const draws = [50, 1000, 300, 0];
  let state = nativeArmageddonStart([100, 0xa6, 0x38]);
  expect(state).toEqual({ count: 100, timer: 0, interval: 0xa6, weapon: 0x38 });
  const first = nativeArmageddonTick(state, () => draws.shift());
  // Timer 0 - 20 expires: interval + 50 + overshoot; column 1000, drift +100.
  expect(first.state).toMatchObject({ count: 99, timer: 0xa6 + 50 - 20 });
  expect(first.meteor).toEqual([0, 0, (1000 - 696) << 16, -696 << 16,
    Math.trunc((500 << 17) / 100), 0x140000, 0x3c00000, 0x15c0000, 0, 0, 0]);
  expect(first.sound).toEqual([0x2c, 8, 0x10000, 0x10000, 0]);
  // 004EB2BF launch puff (004EE7F0 -> message 0x43E) at the spawn point.
  expect(first.effect).toEqual([0x10000, (1000 - 696) << 16, -696 << 16, 0, 0, 0, 0, 0, 0x349, 0, 0x10000, 0x1999]);
  state = first.state;
  let ticks = 0, spawned = null;
  while (!spawned && ticks < 20) {
    const result = nativeArmageddonTick(state, () => 0x80000000);
    state = result.state; spawned = result.meteor; ticks++;
    if (spawned) expect(result.sound).toBeNull();
  }
  // 196 ms rearm drains at 20 ms per frame: the 10th frame launches again.
  expect(ticks).toBe(10);
  expect(state.count).toBe(98);
  // Negative drift draws shift the column right and launch leftward.
  const left = nativeArmageddonTick({ ...state, timer: 0 }, (() => { const d = [0, 0, 0, 1]; return () => d.shift(); })());
  expect(left.meteor[2]).toBe(Math.trunc(696 * 200 / 100) << 16);
  expect(left.meteor[4]).toBe(Math.trunc((-1000 << 17) / 100));
  expect(nativeArmageddonTick({ ...state, count: 0 }, () => 0)).toMatchObject({ meteor: null, effect: null });
});

test("meteor projectile block comes from weapon 56 entry +0x70", { tag: "@logic" }, () => {
  const block = nativeWeaponSlotBlock(56, 0x70);
  expect(block).toHaveLength(94);
  // Shape 2 and sprite 640 (meteor) as in the default scheme record.
  expect(block[0]).toBe(2);
  expect(block[9]).toBe(640);
});

test("Nuclear Test reads its water rise and dose from weapon 55", { tag: "@logic" }, () => {
  expect(nativeWeaponSlotBlock(55, 0x70).slice(0, 2)).toEqual([120, 2]);
});

test("default scheme loadout comes from the recovered inventory setup", { tag: "@logic" }, async () => {
  const { nativeSchemeLoadouts } = await import("../src/armageddon/scheme-loadout.js");
  const [first, second] = nativeSchemeLoadouts(195, 2);
  // Slots: 1 bazooka, 3 mortar, 6 grenade, 7 cluster, 24 super sheep, 37 rope.
  expect([1, 3, 6, 7, 24, 37].map(slot => first.counts[slot])).toEqual([-1, 5, -1, 3, 0, 5]);
  expect(second.counts).toEqual(first.counts);
  expect(first.delays[2]).toBe(1);
});

test("scene shake decays through the original 004EDA70 smoothing", { tag: "@logic" }, async () => {
  const { nativeCameraShakeDecay } = await import("../src/armageddon/camera-shake.js");
  // Tenth-per-frame decay with a 0x7ae minimum step, reaching zero.
  let shake = 0x8000, frames = 0;
  const first = nativeCameraShakeDecay(shake);
  expect(first).toBe(0x8000 - 3277);
  while (shake && frames < 100) { shake = nativeCameraShakeDecay(shake); frames++; }
  expect(shake).toBe(0);
  expect(frames).toBeLessThan(40);
});

test("worm energy follows scheme byte 0x15 and the handicap share", { tag: "@logic" }, async () => {
  const { nativeSchemeWormEnergy } = await import("../src/armageddon/scheme-loadout.js");
  expect(nativeSchemeWormEnergy(195)).toBe(100);
  expect(nativeSchemeWormEnergy(193)).toBe(150);
  // 004194CB: a +1 handicap adds a quarter of the scheme energy.
  expect(nativeSchemeWormEnergy(195, 1)).toBe(125);
});

test("classic crate drops draw from the original 100-entry scheme bag", { tag: "@logic" }, async () => {
  const { nativeCrateDropBag, nativeCrateDropDraw } = await import("../src/armageddon/crate-drop.js");
  const bag = nativeCrateDropBag(195);
  const counts = {}; for (const kind of bag.available) counts[kind] = (counts[kind] ?? 0) + 1;
  // Scheme bytes 20/10/10 over three enabled kinds: 6 weapon, 3 health, 3 utility.
  expect(counts).toEqual({ 0: 88, 1: 6, 2: 3, 4: 3 });
  // 004B7D00 draws (rand >> 16) % count and swaps the last entry into the hole.
  const first = nativeCrateDropDraw(bag, 0, () => 2 << 16);
  expect(first.kind).toBe(1);
  expect(first.bag.available).toHaveLength(99);
  expect(first.bag.available[2]).toBe(0);
  expect(first.bag.used).toEqual([1]);
  // Five live crates suppress the draw without touching the bag.
  expect(nativeCrateDropDraw(bag, 5, () => 0)).toEqual({ bag, kind: 0 });
  // Draws without replacement: 100 draws produce exactly the bag, then it refills.
  let state = bag, drawn = {};
  for (let i = 0; i < 100; i++) {
    const result = nativeCrateDropDraw(state, 0, () => (i * 7919) << 16);
    state = result.bag; drawn[result.kind] = (drawn[result.kind] ?? 0) + 1;
  }
  expect(drawn).toEqual(counts);
  expect(state.available).toHaveLength(100);
});

test("default scheme pacing decodes turn, retreat, round and sudden death", { tag: "@logic" }, async () => {
  const { nativeSchemeTiming } = await import("../src/armageddon/scheme-loadout.js");
  expect(nativeSchemeTiming(195)).toEqual({ retreatTime: 3, turnTime: 45, roundSeconds: 900,
    suddenDeathEvent: 2, waterRise: 20 });
});
