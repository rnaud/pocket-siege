import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/camera-input.json" with { type: "json" };
import { nativeCameraMouseLook, nativeWormFrameCameraRequest, nativeWormFrameActivity } from "../src/armageddon/camera-framing.js";

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

test("camera world limits match the recovered scene display initialisation", { tag: "@logic" }, async () => {
  const { nativeInitializeSceneDisplay } = await import("../src/armageddon/scene-display.js");
  const { nativeCameraWorldLimits } = await import("../src/armageddon/camera-framing.js");
  for (const closed of [false, true]) {
    const words = new Map(), bytes = new Map();
    const memory = {
      get: (a) => words.get(a) ?? 0, put: (a, v) => words.set(a, v >>> 0),
      byte: (a) => bytes.get(a) ?? 0, putByte: (a, v) => bytes.set(a, v & 255),
    };
    bytes.set(0x11d67, closed ? 1 : 0);
    nativeInitializeSceneDisplay(memory, 0, { configureDisplay: () => {} });
    const native = [0x1b8cc, 0x1b8d4, 0x1b8d0, 0x1b8d8].map((a) => memory.get(a) | 0);
    // Scene display starts the bottom at 0x358 = the 696-row waterline + 160.
    expect(nativeCameraWorldLimits({ closed, width: 1920, waterY: 696 })).toEqual(native);
  }
  // 004EABB5: a rising sea moves the bottom with it, keeping 768 below the top.
  expect(nativeCameraWorldLimits({ waterY: 500 })[3]).toBe(660 << 16);
  expect(nativeCameraWorldLimits({ closed: true, waterY: 100 })[3]).toBe((2 + 768) << 16);
});

test("worm frame busy wakes match original 004DEF07 activity calls", { tag: "@logic" }, () => {
  for (const c of fixture.frames)
    expect(nativeWormFrameActivity(c.state, c.moving), JSON.stringify(c)).toBe(c.activity);
});
