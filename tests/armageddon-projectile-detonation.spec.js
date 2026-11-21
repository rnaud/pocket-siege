import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/projectile-detonation.json" with { type: "json" };
import { nativeProjectileDetonation } from "../src/armageddon/projectile-detonation.js";
import { MatchRandom } from "../src/armageddon/random.js";

test("projectile blast packets, secondary dispatch and RNG match the executable", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(288);
  for (const [i,c] of fixture.cases.entries()) {
    const rng = new MatchRandom(c.seed);
    rng.frame = c.frame;
    expect(nativeProjectileDetonation(c.body, c.x, c.y, () => rng.logicUint()), `case ${i}`).toEqual(c.calls);
    expect(rng.logicState).toBe(c.randomState);
  }
});
