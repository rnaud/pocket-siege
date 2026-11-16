import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/worm-camera.json" with { type: "json" };
import { nativeWormCameraRequest } from "../src/armageddon/camera-priority.js";
test("worm camera requests match active, motion, drowning and visibility branches", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(768);
  for (const [i, c] of fixture.cases.entries())
    expect(
      nativeWormCameraRequest(c, {
        left: 0,
        right: 1200 * 65536,
        top: -256 * 65536,
        bottom: 800,
        sameTeam: c.sameTeam,
        override: c.override,
      }),
      `case ${i}`,
    ).toEqual(c.request);
});
