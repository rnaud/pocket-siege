import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/mine-proximity.json" with { type: "json" };
import { nativeMineProximity } from "../src/armageddon/mine-proximity.js";
test("mine proximity matches original typed, ordered fixed-coordinate detection", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(432);
  for (const [i, c] of fixture.cases.entries())
    expect(nativeMineProximity(c, c.radius, c.candidates), `case ${i}`).toBe(
      c.result,
    );
});
