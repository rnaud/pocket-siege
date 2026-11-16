import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/drill.json" with { type: "json" };
import { nativeDrillTick } from "../src/armageddon/drill.js";

test("drill ticks match original random consumption, cuts, impulses and timer", { tag: "@logic" }, () => {
  for (const row of fixture.cases) {
    let cursor = 0;
    expect(nativeDrillTick(row.body, row.record, () => row.random[cursor++], {
      overlap: () => row.occupied,
    })).toEqual(row.output);
    expect(cursor).toBe(row.randomCount);
  }
});
