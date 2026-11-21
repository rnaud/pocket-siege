import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/projectile-animation-clock.json" with { type: "json" };
import { nativeProjectileAnimationRate, nativeProjectileAnimationTick } from "../src/armageddon/projectile-art.js";

test("projectile animation rates and tick progress match original signed arithmetic", { tag: "@logic" }, () => {
  expect(fixture.rates).toHaveLength(48);
  expect(fixture.cases).toHaveLength(280);
  for (const c of fixture.rates)
    expect(nativeProjectileAnimationRate(c.x, c.y), JSON.stringify(c)).toBe(c.rate);
  for (const c of fixture.cases)
    expect(nativeProjectileAnimationTick(c.mode, c.rate, c.progress), JSON.stringify(c)).toBe(c.output);
});
