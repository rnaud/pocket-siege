import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/aim-step.json" with { type: "json" };
import { nativeAimStep, nativeWeaponSubtype } from "../src/armageddon/aim-step.js";

test("held aim steps match the original 004FB567 update", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(684);
  for (const { input, aim } of fixture.cases)
    expect(nativeAimStep(input.aim, { down: Boolean(input.down), up: Boolean(input.up),
      subtype: input.subtype, slot: input.slot }), JSON.stringify(input)).toBe(aim);
  // The Longbow is the weapon with subtype 0xA.
  expect(nativeWeaponSubtype(15)).toBe(0xa);
});
