import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/fire-punch.json" with { type: "json" };
import entryFixture from "./fixtures/armageddon/fire-punch-entry.json" with { type: "json" };
import { nativeFirePunchRequest, nativeFirePunchEntry } from "../src/armageddon/fire-punch.js";

test("Fire Punch launch and terrain clearance match the original executable", () => {
  expect(entryFixture.cases).toHaveLength(24);
  for (const row of entryFixture.cases)
    expect(nativeFirePunchEntry(row.power, row.x, row.y)).toEqual(row.calls);
});

test("Fire Punch attack rectangle and impulse match the original executable", () => {
  expect(fixture.cases).toHaveLength(140);
  for (const row of fixture.cases)
    expect(nativeFirePunchRequest(row.record, row.x, row.y, row.facing)).toEqual(row.request);
});
