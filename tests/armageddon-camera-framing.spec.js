import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/camera-framing.json" with { type: "json" };
import {
  nativeCameraFrame,
  nativeCameraEase,
} from "../src/armageddon/camera-framing.js";
test("camera fitting and world limits match original projection routines", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(168);
  for (const [i, c] of fixture.cases.entries())
    expect(
      nativeCameraFrame(
        c.camera,
        c.viewport,
        c.bounds,
        c.depth,
        c.operation === "limit",
      ),
      `case ${i}`,
    ).toEqual(c.after);
});
test("camera easing and pixel snapping match original simulation ticks", { tag: "@logic" }, () => {
  expect(fixture.easing).toHaveLength(900);
  for (const [i, c] of fixture.easing.entries())
    expect(nativeCameraEase(c.before, c.target), `tick ${i}`).toEqual({
      camera: c.after,
      settled: c.settled,
    });
});

import { NativeCameraFraming } from "../src/armageddon/camera-framing.js";
test("camera task ordering matches complete original 004ED710 ticks", { tag: "@logic" }, () => {
  expect(fixture.orchestration).toHaveLength(360);
  for (const [i, c] of fixture.orchestration.entries()) {
    const framing = new NativeCameraFraming(0, 0, c.before[0][3]);
    framing.target = c.before[0];
    framing.display = c.before[1];
    framing.tick(c.bounds, c.viewport, c.limits);
    expect([framing.target, framing.display], `tick ${i}`).toEqual(c.after);
  }
});

import { NativeCameraPriority } from "../src/armageddon/camera-priority.js";
test("special requests and signed suppression counters match original camera task", { tag: "@logic" }, () => {
  expect(fixture.special_cases).toHaveLength(45);
  for (const [i, c] of fixture.special_cases.entries()) {
    const priority = new NativeCameraPriority();
    priority.offer(7, c.bounds[0], c.bounds[1]);
    priority.offer(7, c.bounds[2], c.bounds[3]);
    for (const request of c.requests) priority.offerSpecial(...request);
    // Inactive native groups retain stale bounds; the active flag is authoritative.
    expect(priority.special).toEqual(c.special[0] ? c.special.slice(1) : null);
    const framing = new NativeCameraFraming(
      c.initial[0],
      c.initial[1],
      c.initial[3],
    );
    framing.suppression = c.suppression;
    framing.track(priority, 100, c.viewport, c.limits);
    expect([framing.target, framing.display], `case ${i}`).toEqual(c.after);
    expect(framing.suppression).toBe(c.outputSuppression);
    expect(priority.cap).toBe(c.outputCap);
    expect(priority.lastFrame).toBe(c.outputFrame);
  }
});
