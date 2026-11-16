import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/hitscan-resolution.json" with { type: "json" };
import { nativeHitscanResolution } from "../src/armageddon/hitscan-resolution.js";
import { nextLogicRandom } from "../src/armageddon/numeric.js";

test("hit and miss packets, damage variation and RNG match original executable", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(1080);
  for (const row of fixture.cases) {
    let state = row.seed;
    expect(
      nativeHitscanResolution(
        row.shot,
        row.config,
        row.body,
        row.terrain,
        () => (state = nextLogicRandom(state, row.frame)),
      ),
      JSON.stringify(row),
    ).toEqual(row.output);
    expect(state).toBe(row.random);
  }
});
