import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/map-objects.json" with { type: "json" };
import { nativeMapObjects } from "../src/armageddon/map-objects.js";

test("natural mine/barrel placement matches original selection, packets and RNG", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(144);
  for (const [i, c] of fixture.cases.entries()) {
    let seed = c.seed;
    const result = nativeMapObjects(
      fixture.points,
      c,
      () => (seed = (Math.imul(seed, 0x19660d) + 0x3c6ef35f) >>> 0),
    );
    expect(result, `case ${i}`).toEqual({
      calls: c.calls,
      remaining: c.remaining,
    });
    expect(seed, `random ${i}`).toBe(c.randomState);
  }
});
