import { test, expect } from "@playwright/test";

// The shared fixture opts into the host control layout; these cases check
// the default desktop presentation instead.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("pocket-siege-host-layout"));
});

async function startLocalMatch(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await expect(page.locator("#menu")).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 30000 })
    .toBe("aim");
}

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
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(200);
  await page.keyboard.up("ArrowLeft");
  await expect.poll(inView).toBe(true);
});

test("right click opens the arsenal and Escape opens the in-game menu", async ({ page }) => {
  await startLocalMatch(page);
  const arena = page.locator("#arena");
  await arena.click({ button: "right", position: { x: 400, y: 300 } });
  await expect(page.locator("#weapon-tray")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#weapon-tray")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();
});
