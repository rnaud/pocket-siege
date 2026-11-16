import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/blast-damage.json" with { type: "json" };
import { nativeBlastDamage } from "../src/armageddon/blast-damage.js";
test("radial blast falloff and impulses match original executable", () => {
  expect(fixture.cases).toHaveLength(648);
  for (const row of fixture.cases) {
    expect(
      nativeBlastDamage(
        { x: row.x, y: row.y, impulseScale: row.scale },
        0,
        0,
        row.push,
        row.damage,
        row.factor,
      ),
      JSON.stringify(row),
    ).toEqual({ damage: row.result, impulses: row.impulses });
  }
});
