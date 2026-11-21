// Phone viewport and touch input differ from the project's desktop context,
// so this file uses its own page rather than the shared one.
import { test, expect } from "@playwright/test";
import { startMatch, renderedFrame } from "./helpers/match.js";

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

// Dispatches touch pointer events on the battlefield: each step moves the
// listed fingers (id -> [x, y] in arena-relative CSS pixels).
async function touch(page, type, fingers) {
  await page.evaluate(({ type, fingers }) => {
    const arena = document.querySelector("#arena"), box = arena.getBoundingClientRect();
    for (const [id, [x, y]] of Object.entries(fingers))
      arena.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: "touch",
        pointerId: Number(id), isPrimary: id === "1", clientX: box.x + x, clientY: box.y + y }));
  }, { type, fingers });
}

const camera = (page) => page.evaluate(() => window.siege.getState().camera);

// Phones frame through the original 1:1 camera; the suite's stored host
// layout preference would switch it to the host camera, so drop it here.
test.describe("original camera", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("pinching the battlefield zooms the view in and out", async ({ page }) => {
    await startMatch(page, { map: "fern", seed: 42, manualClock: true });
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(1));
    await renderedFrame(page);
    const start = await camera(page);
    expect(start.zoom).toBe(1);
    const phase = await page.evaluate(() => window.siege.getState().phase);

    // Spread two fingers apart: zoom in, fewer world pixels on screen.
    await touch(page, "pointerdown", { 1: [200, 130] });
    await touch(page, "pointerdown", { 2: [280, 130] });
    await touch(page, "pointermove", { 1: [160, 130], 2: [320, 130] });
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(1));
    await renderedFrame(page);
    const zoomed = await camera(page);
    expect(zoomed.zoom).toBeCloseTo(2, 1);
    expect(zoomed.w).toBeLessThan(start.w * 0.6);
    await touch(page, "pointerup", { 1: [160, 130], 2: [320, 130] });
    // Neither finger counts as a tap that aims or fires.
    expect(await page.evaluate(() => window.siege.getState().phase)).toBe(phase);

    // Pinch together: zoom out past 1:1, up to the island's width.
    await touch(page, "pointerdown", { 3: [100, 130] });
    await touch(page, "pointerdown", { 4: [380, 130] });
    await touch(page, "pointermove", { 3: [235, 130], 4: [245, 130] });
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(1));
    await renderedFrame(page);
    const wide = await camera(page);
    expect(wide.zoom).toBeLessThan(1);
    expect(wide.w).toBeGreaterThan(start.w);
    expect(wide.w).toBeLessThanOrEqual(await page.evaluate(() => window.siege.getState().width ?? Infinity));
    await touch(page, "pointerup", { 3: [235, 130], 4: [245, 130] });

    // The zoom stays after the fingers lift while the camera keeps following play.
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(10));
    await renderedFrame(page);
    expect((await camera(page)).zoom).toBe(wide.zoom);
  });
});

test("pinching zooms the host camera in and back to the whole island", async ({ page }) => {
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  await renderedFrame(page);
  const start = await camera(page);
  await touch(page, "pointerdown", { 1: [200, 130] });
  await touch(page, "pointerdown", { 2: [280, 130] });
  await touch(page, "pointermove", { 1: [160, 130], 2: [320, 130] });
  await renderedFrame(page);
  const zoomed = await camera(page);
  expect(zoomed.zoom).toBeCloseTo(2, 1);
  expect(zoomed.w).toBeLessThan(start.w * 0.6);
  await touch(page, "pointermove", { 1: [235, 130], 2: [245, 130] });
  await renderedFrame(page);
  const back = await camera(page);
  expect(back.zoom).toBe(1);
  expect([back.w, back.h]).toEqual([start.w, start.h]);
  await touch(page, "pointerup", { 1: [235, 130], 2: [245, 130] });
});
