import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/homing.json" with { type: "json" };
import { nativeHomingSteer } from "../src/armageddon/homing.js";

test("homing acceleration, accumulator and proportional caps match original math", () => {
  expect(fixture.cases).toHaveLength(168);
  for (const [index,c] of fixture.cases.entries())
    expect(nativeHomingSteer(c.body), `case ${index}`).toEqual(c.output);
});

import schedule from "./fixtures/armageddon/homing-schedule.json" with { type: "json" };
import { nativeHomingSchedule } from "../src/armageddon/homing.js";

test("homing activation and guidance duration match original event ordering", () => {
  expect(schedule.cases).toHaveLength(336);
  for (const [index,c] of schedule.cases.entries())
    expect(nativeHomingSchedule(c.body), `case ${index}`).toEqual({ body: c.output, calls: c.calls });
});
