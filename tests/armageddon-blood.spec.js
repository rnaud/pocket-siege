import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/blood.json" with { type: "json" };
import { nativeBloodBurst } from "../src/armageddon/blood.js";
import { nextLogicRandom } from "../src/armageddon/numeric.js";
import { startMatch } from "./helpers/match.js";
test("blood particle packets and logic RNG match original emitter", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(96);
  for (const row of fixture.cases) {
    let state = row.seed;
    expect(
      nativeBloodBurst(
        row.x,
        row.y,
        0,
        0,
        row.damage,
        row.amount,
        row.mode,
        0x3d70,
        () => (state = nextLogicRandom(state, row.frame)),
      ),
    ).toEqual(row.requests);
    expect(state).toBe(row.random);
  }
});

test("live radial blast emits the original wormhit particle", async ({
  page,
}) => {
  await startMatch(page);
  const result = await page.evaluate(() => {
    const w = window.siege.getState().worms[0];
    window.siege.debug.explodeAt(w.x - 20, w.y, "death");
    return window.siege
      .getState()
      .nativeParticles.some((p) => p.sprite === "wormhit1");
  });
  expect(result).toBe(true);
});
