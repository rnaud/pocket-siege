import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/projectile-art.json" with { type: "json" };
import { nativeProjectileArt } from "../src/armageddon/projectile-art.js";

test("projectile render modes reproduce original progress, sprite and facing", () => {
  expect(fixture.cases).toHaveLength(224);
  for (const [index,c] of fixture.cases.entries())
    expect(nativeProjectileArt(c.input), `case ${index}`).toEqual(c.output);
});
