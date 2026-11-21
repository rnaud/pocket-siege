import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/worm-camera.json" with { type: "json" };
import { nativeWormCameraRequest } from "../src/armageddon/camera-priority.js";
import { nativeWormState } from "../src/armageddon/worm-collision-type.js";
test("worm camera requests match active, motion, drowning and visibility branches", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(768);
  for (const frozen of [false, true]) {
    const state = nativeWormState({ drowned: true, frozen, originalHurt: {state: 0x80} });
    expect(state).toBe(0x87);
    expect(nativeWormCameraRequest({ x: 0, y: 650 * 65536, active: 0, state, motion: [0,0,0,0,0] },
      { left: 0, right: 1200 * 65536, top: 0, bottom: 808 })).toEqual([9, 0, 650 * 65536]);
  }
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
