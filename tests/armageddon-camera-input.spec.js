import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/camera-input.json" with { type: "json" };
import { nativeCameraMouseLook, nativeWormFrameCameraRequest } from "../src/armageddon/camera-framing.js";

test("mouse-look matches original 004ED5F0 thresholds, holds and player gate", { tag: "@logic" }, () => {
  expect(fixture.mouse).toHaveLength(264);
  for (const c of fixture.mouse) {
    const framing = { target: [...c.target, 1000 * 65536], suppression: c.suppression };
    // Only the first local player's camera polls into its own target.
    if (c.players[0] === c.player) nativeCameraMouseLook(framing, c.dx, c.dy);
    expect(framing.target.slice(0, 3), JSON.stringify(c)).toEqual(c.after);
    expect(framing.suppression, JSON.stringify(c)).toBe(c.suppressionAfter);
  }
});

test("worm frame camera requests match original 004DEF07 state dispatch", { tag: "@logic" }, () => {
  expect(fixture.frames).toHaveLength(88);
  for (const c of fixture.frames)
    expect(nativeWormFrameCameraRequest(c.state, c.moving), JSON.stringify(c)).toBe(c.camera);
});
