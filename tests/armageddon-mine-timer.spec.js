import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-timer.json" with { type: "json" };
import {
  nativeMineTimer,
  nativeMineInitialTimer,
} from "../src/armageddon/mine-timer.js";
test("mine arming, scan cadence, fuse and warnings match original timer block", () => {
  expect(fixture.cases).toHaveLength(1728);
  for (const [i, c] of fixture.cases.entries()) {
    expect(
      nativeMineTimer(c.before, c.environment, () => c.environment.near),
      `case ${i}`,
    ).toEqual({ body: c.after, calls: c.calls, expired: c.expired });
  }
});
test("default mine arms for four seconds then runs its three-second triggered fuse", () => {
  let body = nativeMineInitialTimer(),
    triggeredAt = 0,
    expiredAt = 0,
    beeps = 0;
  for (let frame = 0; frame < 400; frame++) {
    const result = nativeMineTimer(
      body,
      { vx: 0, vy: 0, awake: 0, submerged: 0, frame, friction: 66 },
      () => true,
    );
    if (!body.triggered && result.body.triggered) triggeredAt = frame;
    body = result.body;
    beeps += result.calls.filter(
      (c) => c.operation === "sound" && c.request[0] === 89,
    ).length;
    if (result.expired) {
      expiredAt = frame;
      break;
    }
  }
  expect(triggeredAt).toBe(200);
  expect(expiredAt).toBe(350);
  expect(beeps).toBe(12);
});
