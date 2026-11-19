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
  expect(nativeArmageddonTick({ ...state, count: 0 }, () => 0).meteor).toBeNull();
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
