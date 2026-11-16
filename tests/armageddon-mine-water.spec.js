import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-water.json" with { type: "json" };
import { nativeMineWater } from "../src/armageddon/mine-water.js";

test("mine bubble cadence, water flags and splash transitions match original executable", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(256);
  for (const [i, c] of fixture.cases.entries()) {
    let draws = 0;
    const result = nativeMineWater(
      c.before,
      c.environment,
      () => fixture.random[draws++ % fixture.random.length],
    );
    expect(result, `case ${i}`).toEqual({ body: c.after, calls: c.calls });
    expect(draws).toBe(c.draws);
  }
});
