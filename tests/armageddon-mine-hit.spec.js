import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-hit.json" with { type: "json" };
import {
  nativeMineHit,
  nativeMineHitBodies,
} from "../src/armageddon/mine-hit.js";
import { nativeHitscanBody } from "../src/armageddon/hitscan-body.js";
import { nativeAreaDamage } from "../src/armageddon/area-damage.js";

test("mine direct hit impulse matches original executable", () => {
  expect(fixture.cases).toHaveLength(72);
  for (const [i, c] of fixture.cases.entries()) {
    expect(nativeMineHit(c.before, c.packet), `case ${i}`).toEqual(c.after);
  }
});

test("mine bodies participate in native hitscan and area event dispatch", () => {
  const mine = {
    nativeBody: { ...fixture.cases[0].before, type: 10, x: 40 * 65536, y: 0 },
  };
  const targets = nativeMineHitBodies([mine]);
  expect(
    nativeHitscanBody(targets, 0, 0, 65536, 0, 100, 1 << 10).body.mine,
  ).toBe(mine);
  const events = nativeAreaDamage(targets, [
    40 * 65536,
    0,
    65536,
    65536,
    30,
    65536,
    -65536,
    3,
    0,
    0,
    1 << 10,
    0,
  ]);
  expect(events).toHaveLength(1);
  const after = nativeMineHit(mine.nativeBody, events[0].packet);
  expect(after.vx).toBeGreaterThan(mine.nativeBody.vx);
  expect(after.accumulated).toBe(mine.nativeBody.accumulated);
});
