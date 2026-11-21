import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/projectile-lifetime.json" with { type: "json" };
import { nativeProjectileLifetime } from "../src/armageddon/projectile-lifetime.js";

test("projectile distance, rest, phase and depth lifecycle match the original", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(640);
  for (const [i, c] of fixture.cases.entries())
    expect(nativeProjectileLifetime(c.body, c.environment), `case ${i}`).toEqual(c.calls);
});
