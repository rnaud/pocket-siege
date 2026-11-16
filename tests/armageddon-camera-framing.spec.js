import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/camera-framing.json" with { type: "json" };
import {
  nativeCameraFrame,
  nativeCameraEase,
} from "../src/armageddon/camera-framing.js";
test("camera fitting and world limits match original projection routines", () => {
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
test("camera easing and pixel snapping match original simulation ticks", () => {
  expect(fixture.easing).toHaveLength(900);
  for (const [i, c] of fixture.easing.entries())
    expect(nativeCameraEase(c.before, c.target), `tick ${i}`).toEqual({
      camera: c.after,
      settled: c.settled,
    });
});

import { NativeCameraFraming } from "../src/armageddon/camera-framing.js";
test("camera task ordering matches complete original 004ED710 ticks", () => {
  expect(fixture.orchestration).toHaveLength(360);
  for (const [i, c] of fixture.orchestration.entries()) {
    const framing = new NativeCameraFraming(0, 0, c.before[0][3]);
    framing.target = c.before[0];
    framing.display = c.before[1];
    framing.tick(c.bounds, c.viewport, c.limits);
    expect([framing.target, framing.display], `tick ${i}`).toEqual(c.after);
  }
});
