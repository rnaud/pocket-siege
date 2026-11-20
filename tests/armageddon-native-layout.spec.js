import { test, expect } from "@playwright/test";
import { advanceUntil, startNativeLayoutMatch as startLocalMatch } from "./helpers/scenario-page.js";

// The shared fixture opts into the host control layout; these cases check
// the default desktop presentation instead.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("pocket-siege-host-layout"));
});


test("desktop shows the original full-window battlefield at one world pixel per pixel", async ({ page }) => {
  await startLocalMatch(page);
  await expect(page.locator("body")).toHaveClass(/native-layout/);
  await expect(page.locator("#app > header")).toBeHidden();
  await expect(page.locator("#fire")).toBeHidden();
  await expect(page.locator("#aim-reticle text")).toBeHidden();
  await expect(page.locator("#timer")).toBeVisible();
  const layout = await page.evaluate(() => {
    const arena = document.querySelector("#arena");
    const canvas = arena.querySelector("canvas");
    return { width: arena.clientWidth, height: arena.clientHeight, innerWidth, innerHeight,
      canvasWidth: canvas.width, density: devicePixelRatio, camera: window.siege.getState().camera };
  });
  expect(layout.width).toBe(layout.innerWidth);
  expect(layout.height).toBe(layout.innerHeight);
  expect(layout.camera.w).toBe(layout.width);
  expect(layout.camera.h).toBe(layout.height);
  expect(layout.camera.zoom).toBe(1);
  expect(layout.canvasWidth).toBe(Math.ceil(layout.width * layout.density));
});

test("turn start frames the active worm and mouse-look pans the native camera", async ({ page }) => {
  await startLocalMatch(page);
  // The opening supply crate falls during the first turn and draws the
  // camera; remove it so the turn-start framing itself is checked.
  await page.evaluate(() => { if (window.siege.getState().crates.length) window.siege.debug.collectCrate(); });
  await page.keyboard.down("ArrowRight");
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(5));
  await page.keyboard.up("ArrowRight");
  const inView = () => page.evaluate(() => {
    const s = window.siege.getState(), w = s.worms[s.current], c = s.camera;
    return w.x >= c.x && w.x <= c.x + c.w && w.y >= c.y && w.y <= c.y + c.h;
  });
  await expect.poll(inView).toBe(true);
  const before = await page.evaluate(() => window.siege.getState().camera.x);
  const direction = before > 0 ? -1 : 1;
  await page.evaluate((direction) => {
    const arena = document.querySelector("#arena");
    for (let i = 0; i < 10; i++)
      arena.dispatchEvent(new PointerEvent("pointermove", { pointerType: "mouse", bubbles: true,
        movementX: 40 * direction, movementY: 0, clientX: 600, clientY: 300 }));
  }, direction);
  await expect.poll(() => page.evaluate(() => window.siege.getState().camera.x)).not.toBe(before);
  // Mouse-look holds automatic framing for 100 frames; movement input
  // re-requests the active worm afterwards.
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(110));
  // Movement requests the camera on every tick the key is held.
  await page.keyboard.down("ArrowLeft");
  await expect.poll(inView).toBe(true);
  await page.keyboard.up("ArrowLeft");
});

test("the camera roams the original world limits past the map edges", async ({ page }) => {
  await startLocalMatch(page);
  await page.evaluate(() => {
    const arena = document.querySelector("#arena");
    for (let i = 0; i < 40; i++)
      arena.dispatchEvent(new PointerEvent("pointermove", { pointerType: "mouse", bubbles: true,
        movementX: -200, movementY: -200, clientX: 600, clientY: 300 }));
  });
  // 0049D2CE: open landscapes allow 2046 pixels past the left and top edges.
  await expect.poll(() => page.evaluate(() => window.siege.getState().camera.x)).toBe(-2046);
  await expect.poll(() => page.evaluate(() => {
    const s = window.siege.getState();
    return s.camera.y + s.camera.h - s.world.height;
  })).toBe(2046);
});

test("target selection moves a native cursor that the camera follows", async ({ page }) => {
  // A fixed map keeps the cursor's destination in open sky above the island.
  await startLocalMatch(page, "fern");
  await page.keyboard.press("t");
  await expect.poll(() => page.evaluate(() => window.siege.getState().targetUtility)).toBe("teleport");
  const cameraAt = () => page.evaluate(() => { const c = window.siege.getState().camera; return `${c.x},${c.y}`; });
  const before = await cameraAt();
  const direction = Number(before.split(",")[0]) > 600 ? -1 : 1;
  await page.evaluate((direction) => {
    const arena = document.querySelector("#arena");
    for (let i = 0; i < 20; i++)
      arena.dispatchEvent(new PointerEvent("pointermove", { pointerType: "mouse", bubbles: true,
        movementX: 15 * direction, movementY: -12, clientX: 600, clientY: 300 }));
  }, direction);
  // 004E65F0 keeps the cursor framed through a priority-0 request.
  await expect.poll(cameraAt).not.toBe(before);
  const start = await page.evaluate(() => { const s = window.siege.getState(); return s.worms[s.current].x; });
  // The click position is ignored: the target is the cursor.
  await page.locator("#arena").dispatchEvent("pointerdown", { pointerType: "mouse", button: 0, clientX: 5, clientY: 5 });
  await expect.poll(() => page.evaluate(() => window.siege.getState().targetUtility)).toBe(null);
  await advanceUntil(page, (s, start) => s.worms[s.current].x !== start, { arg: start, label: "teleport" });
  const moved = await page.evaluate(() => { const s = window.siege.getState(); return s.worms[s.current].x; });
  expect(Math.sign(moved - start)).toBe(direction);
});

test("narrow windows keep the host controls with the native 1:1 camera", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 700 });
  await startLocalMatch(page);
  await expect(page.locator("body")).not.toHaveClass(/native-layout/);
  await expect(page.locator("#fire")).toBeVisible();
  const view = await page.evaluate(() => {
    const arena = document.querySelector("#arena"), c = window.siege.getState().camera;
    return { w: c.w, h: c.h, zoom: c.zoom, width: arena.clientWidth, height: arena.clientHeight };
  });
  expect(view).toEqual({ w: view.width, h: view.height, zoom: 1, width: view.width, height: view.height });
});

test("starting a match captures the mouse; Esc releases it, a second Esc opens the menu", async ({ page }) => {
  await startLocalMatch(page, null, { keepPointerLock: true });
  const locked = () => page.evaluate(() => document.pointerLockElement?.id ?? null);
  try {
    await expect.poll(locked, { timeout: 1500 }).toBe("arena");
  } catch {
    test.skip(true, "This browser does not grant pointer lock");
  }
  await page.keyboard.press("Escape");
  await expect.poll(locked).toBe(null);
  await page.waitForTimeout(500);
  await expect(page.locator("#menu")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();
});
