import { test, expect } from "./helpers/shared-page.js";
import fs from "node:fs";
import { nativeProjectileBody } from "../src/armageddon/projectile-body.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/projectile-body.json", import.meta.url),
  ),
);
test("projectile physics configuration matches original constructor arithmetic", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(432);
  for (const v of fixture.cases)
    expect(
      nativeProjectileBody(v.base, v.config, v.payload, v.frictionByte),
      JSON.stringify(v),
    ).toEqual(v.output);
});

const selections = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/projectile-selection.json", import.meta.url),
  ),
);
test("primary and secondary projectile selection matches native words and events", { tag: "@logic" }, async () => {
  const { nativeProjectileSelection } =
    await import("../src/armageddon/projectile-body.js");
  expect(selections.cases).toHaveLength(355);
  for (const v of selections.cases) {
    const result = nativeProjectileSelection(v.block, v.payload);
    expect(result.words, JSON.stringify(v)).toEqual(v.words);
    expect(result.sounds).toEqual(v.sounds);
    expect(result.ownerEvent).toBe(v.ownerEvent);
    expect(Number(result.ownerEvent !== null)).toBe(v.ownerFlag);
  }
});
