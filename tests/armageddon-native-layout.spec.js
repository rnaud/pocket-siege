import { test, expect } from "@playwright/test";

// The shared fixture opts into the host control layout; these cases check
// the default desktop presentation instead.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("pocket-siege-host-layout"));
});

async function startLocalMatch(page, map = null) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  if (map) await page.locator("#map-layout").selectOption(map);
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

test("right click opens the original weapon panel and Escape opens the in-game menu", async ({ page }) => {
  await startLocalMatch(page);
  const arena = page.locator("#arena");
  await arena.click({ button: "right", position: { x: 400, y: 300 } });
  const panel = page.locator(".native-arsenal");
  await expect(panel).toBeVisible();
  await expect(page.locator("#weapon-tray")).toBeHidden();
  // 004E5BF0: 10 pixels from the right edge, 23 below the screen centre line
  // of its own height, i.e. its bottom edge sits 23 pixels above the bottom.
  await expect.poll(() => page.evaluate(() => {
    const r = document.querySelector(".native-arsenal").getBoundingClientRect();
    return [innerWidth - r.right, innerHeight - r.bottom, r.width];
  })).toEqual([10, 23, 180]);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();
});

test("the weapon panel cursor hovers cells and a left click equips the weapon", async ({ page }) => {
  await startLocalMatch(page);
  const arena = page.locator("#arena");
  await arena.click({ button: "right", position: { x: 400, y: 300 } });
  await expect.poll(() => page.evaluate(() => window.siege.debug.arsenalPanel().hover)).toEqual([0, 0]);
  const panel = page.locator(".native-arsenal");
  await expect(panel).toHaveAttribute("aria-valuetext", "Bazooka");
  // One cell down is F2: Grenade (00501370 moves the cursor by mouse motion).
  await page.evaluate(() => document.querySelector("#arena").dispatchEvent(new PointerEvent("pointermove",
    { pointerType: "mouse", bubbles: true, movementX: 0, movementY: 29, clientX: 600, clientY: 300 })));
  await expect(panel).toHaveAttribute("aria-valuetext", "Grenade");
  await page.locator("#arena").dispatchEvent("pointerdown", { pointerType: "mouse", button: 0, clientX: 600, clientY: 300 });
  await expect.poll(() => page.evaluate(() => window.siege.getState().weapon)).toBe("grenade");
  await expect(panel).toBeHidden();
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
  const before = await page.evaluate(() => window.siege.getState().camera.x);
  const direction = before > 600 ? -1 : 1;
  await page.evaluate((direction) => {
    const arena = document.querySelector("#arena");
    for (let i = 0; i < 20; i++)
      arena.dispatchEvent(new PointerEvent("pointermove", { pointerType: "mouse", bubbles: true,
        movementX: 15 * direction, movementY: -12, clientX: 600, clientY: 300 }));
  }, direction);
  // 004E65F0 keeps the cursor framed through a priority-0 request.
  await expect.poll(() => page.evaluate(() => window.siege.getState().camera.x)).not.toBe(before);
  const start = await page.evaluate(() => { const s = window.siege.getState(); return s.worms[s.current].x; });
  // The click position is ignored: the target is the cursor.
  await page.locator("#arena").dispatchEvent("pointerdown", { pointerType: "mouse", button: 0, clientX: 5, clientY: 5 });
  await expect.poll(() => page.evaluate(() => window.siege.getState().targetUtility)).toBe(null);
  await expect.poll(() => page.evaluate(() => { const s = window.siege.getState(); return s.worms[s.current].x; }),
    { timeout: 10000 }).not.toBe(start);
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
