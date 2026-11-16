import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/projectile-timer.json" with { type: "json" };
import { nativeProjectileTimer } from "../src/armageddon/projectile-timer.js";

test("projectile fuse, delayed detonation and warning boundaries match the original", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(1320);
  for (const [index,c] of fixture.cases.entries()) {
    expect(nativeProjectileTimer(c.body, {
      ...c.environment, random: () => c.environment.random,
    }), `case ${index}`).toEqual({ body: c.output, calls: c.calls });
  }
});
