import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/direction.json" with { type: "json" };
import { nativeDirectionTurn } from "../src/armageddon/direction.js";

test("projectile direction turns match original fixed-point polynomial and quadrants", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(529);
  for (const c of fixture.cases)
    expect(nativeDirectionTurn(c.x,c.y), JSON.stringify(c)).toBe(c.turn);
});
