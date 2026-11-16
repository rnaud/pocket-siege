import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/projectile-camera.json" with { type: "json" };
import { nativeProjectileCameraRequest } from "../src/armageddon/camera-priority.js";
test("projectile camera priority matches original bounds and submerged branches", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(96);
  for (const [i, c] of fixture.cases.entries()) {
    expect(nativeProjectileCameraRequest(c, c.limits), `case ${i}`).toEqual(
      c.request,
    );
  }
});
