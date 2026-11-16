import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { nativeProjectileBody } from "../src/armageddon/projectile-body.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/projectile-body.json", import.meta.url),
  ),
);
test("projectile physics configuration matches original constructor arithmetic", () => {
  expect(fixture.cases).toHaveLength(432);
  for (const v of fixture.cases)
    expect(
      nativeProjectileBody(v.base, v.config, v.payload, v.frictionByte),
      JSON.stringify(v),
    ).toEqual(v.output);
});
