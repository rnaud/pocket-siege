import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/hitscan-spread.json" with { type: "json" };
import { nativeHitscanRays } from "../src/armageddon/hitscan-spread.js";
import { nextLogicRandom } from "../src/armageddon/numeric.js";
import { nativeShotgunRay } from "../src/armageddon/hitscan-art.js";
test("hitscan directions, complete packets and RNG match original spread loop", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(108);
  for (const row of fixture.cases) {
    let state = row.seed;
    const shot = [...row.shot];
    const rays = nativeHitscanRays(
      shot,
      row.count,
      row.spread,
      () => (state = nextLogicRandom(state, row.frame)),
    );
    expect(rays).toEqual(row.rays);
    expect(state).toBe(row.random);
    expect(shot).toEqual(row.shot);
  }
  expect(nativeShotgunRay).toEqual({
    count: 1,
    spread: 0,
    range: 1920,
    collisionMask: 4332670,
  });
});
