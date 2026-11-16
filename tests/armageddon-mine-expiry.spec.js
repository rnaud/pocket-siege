import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-expiry.json" with { type: "json" };
import {
  NativeMineDudPool,
  nativeMineExpiry,
} from "../src/armageddon/mine-expiry.js";
import { MatchRandom } from "../src/armageddon/random.js";
test("mine dud selection, blast packets and smoke match original expiry dispatch", () => {
  expect(fixture.cases).toHaveLength(576);
  for (const [i, c] of fixture.cases.entries()) {
    const random = new MatchRandom(c.seed);
    random.frame = c.frame;
    const pool = new NativeMineDudPool(c.pool, c.usedBefore);
    expect(
      nativeMineExpiry(c.before, c, pool, {
        logic: () => random.logicUint(),
        visual: () => random.visualUint(),
        proximity: () => c.near,
      }),
      `case ${i}`,
    ).toEqual({ body: c.after, calls: c.calls });
    expect(pool.remaining).toEqual(c.remaining);
    expect(pool.used).toEqual(c.used);
    expect(random.snapshot()).toMatchObject({
      logic: c.logic,
      visual: c.visual,
    });
  }
});
