import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/drill.json" with { type: "json" };
import { nativeDrillEntry, nativeDrillTick } from "../src/armageddon/drill.js";

test("drill ticks match original random consumption, cuts, impulses and timer", { tag: "@logic" }, () => {
  for (const row of fixture.cases) {
    let cursor = 0;
    expect(nativeDrillTick(row.body, row.record, () => row.random[cursor++], {
      overlap: () => row.occupied,
    })).toEqual(row.output);
    expect(cursor).toBe(row.randomCount);
  }
});

test("drill entry matches original animation, counter and duration", { tag: "@logic" }, () => {
  for (const row of fixture.entries)
    expect(nativeDrillEntry(row.body, row.record, row.counter)).toEqual(row.output);
});
