import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/camera-priority.json" with { type: "json" };
import { NativeCameraPriority } from "../src/armageddon/camera-priority.js";
test("camera bounds, disabled accumulation and priority hold match original routines", () => {
  expect(fixture.cases).toHaveLength(120);
  for (const [i, c] of fixture.cases.entries()) {
    const camera = new NativeCameraPriority();
    camera.cap = c.cap;
    camera.lastFrame = c.lastFrame;
    for (const request of c.requests) camera.offer(...request, c.disabled);
    expect(camera.select(c.frame), `case ${i}`).toEqual(c.bounds);
    expect(camera.groups).toEqual(c.groups);
    expect(camera.cap).toBe(c.outputCap);
    expect(camera.lastFrame).toBe(c.outputFrame);
  }
});
