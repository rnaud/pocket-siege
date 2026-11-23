import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/scales.json" with { type: "json" };
import { nativeScalesOfJustice } from "../src/armageddon/scales.js";

test("scales of justice matches the original 0x446 balance", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(180);
  for (const { input, result } of fixture.cases)
    expect(nativeScalesOfJustice(input.alliances, input.teams)).toEqual(result);
});
