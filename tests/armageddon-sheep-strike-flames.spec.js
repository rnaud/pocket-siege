import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/sheep-strike-flames.json" with { type: "json" };
import { nextLogicRandom } from "../src/armageddon/numeric.js";
import { nativeSheepStrikeFlames } from "../src/armageddon/flame-spread.js";

test("sheep strike contact flames match the original 004E2F60", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(24);
  for (const { input, result } of fixture.cases) {
    let random = input.seed;
    const flames = nativeSheepStrikeFlames(input.x, input.y, input.count, () => (random = nextLogicRandom(random, input.frame)));
    // A failed allocation still draws its randoms but builds no flame.
    expect(input.allocated ? flames : []).toEqual(result.flames);
    expect(random >>> 0).toBe(result.random);
  }
});
