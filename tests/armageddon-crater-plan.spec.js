import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/crater-plan.json" with { type: "json" };
import { nativeCraterPlan } from "../src/armageddon/crater-mask.js";
test("crater pass order, threshold, bounds and lock match original dispatch", () => {
  expect(fixture.cases).toHaveLength(48);
  for (const row of fixture.cases)
    expect(nativeCraterPlan(row.strength, row.x, row.y, row.locked)).toEqual(
      row.output,
    );
});
