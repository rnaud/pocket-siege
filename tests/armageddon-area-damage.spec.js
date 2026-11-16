import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/area-damage.json" with { type: "json" };
import { nativeAreaDamage } from "../src/armageddon/area-damage.js";
test("area recipients, damage falloff, self impulse and effects match original executable", () => {
  expect(fixture.cases).toHaveLength(252);
  for (const row of fixture.cases)
    expect(
      nativeAreaDamage(row.bodies, row.request),
      JSON.stringify(row),
    ).toEqual(row.output);
});

test("weapon impulse preserves existing motion and attached native flight", async () => {
  const { applyNativeWeaponImpulse } =
    await import("../src/armageddon/worm-flight.js");
  const worm = {
    vx: 50,
    vy: 100,
    frozen: 0,
    nativeFlight: {
      vx: 65536,
      vy: -131072,
      mass: 65536,
      angularVelocity: 7,
      suspended: 0,
    },
  };
  expect(applyNativeWeaponImpulse(worm, 131072, -65536)).toBe(1);
  expect(worm.vx).toBe(150);
  expect(worm.vy).toBe(150);
  expect(worm.nativeFlight.vx).toBe(196608);
  expect(worm.nativeFlight.vy).toBe(-196608);
  expect(worm.nativeFlight.angularVelocity).toBe(7);
  worm.frozen = 1;
  applyNativeWeaponImpulse(worm, 131072, -65536);
  expect(worm.vx).toBe(0);
  expect(worm.nativeFlight.vx).toBe(0);
  expect(worm.vy).toBe(200);
});
