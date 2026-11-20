import { test, expect } from "@playwright/test";

// The shared fixture opts into the host control layout; these cases check
// the default desktop presentation instead.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("pocket-siege-host-layout"));
});

// Starting a match captures the mouse (pointer lock). Most cases drive hover
// motion with synthetic pointer events, so they release it first.
async function startLocalMatch(page, map = null, { keepPointerLock = false } = {}) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  if (map) await page.locator("#map-layout").selectOption(map);
  await page.locator("#start").click();
  await expect(page.locator("#menu")).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 30000 })
    .toBe("aim");
  if (!keepPointerLock) {
    await page.evaluate(() => document.exitPointerLock());
    await page.waitForTimeout(450);
  }
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
  // Movement requests the camera on every tick the key is held.
  await page.keyboard.down("ArrowLeft");
  await expect.poll(inView).toBe(true);
  await page.keyboard.up("ArrowLeft");
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

test("F-keys cycle the original panel rows and turn controls act when fired", async ({ page }) => {
  await startLocalMatch(page);
  const weapon = () => page.evaluate(() => window.siege.getState().weapon);
  // 00502550: F2 picks the next available slot in its row (Grenade, Cluster...).
  await page.keyboard.press("F2");
  await expect.poll(weapon).toBe("grenade");
  await page.keyboard.press("F2");
  await expect.poll(weapon).toBe("cluster");
  // F1 skips the delayed Homing Missile and wraps back to the Bazooka.
  await page.keyboard.press("F1");
  const first = await weapon();
  expect(first).not.toBe("homing");
  // F12's Skip Go is equipped, not performed, until fire.
  const team = await page.evaluate(() => window.siege.getState().team);
  await page.keyboard.press("F12");
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.siege.getState().phase)).toBe("aim");
  await page.keyboard.press("Space");
  await expect.poll(() => page.evaluate(() => window.siege.getState().phase)).not.toBe("aim");
  expect(await page.evaluate(() => window.siege.getState().team)).toBe(team);
});

test("Control-click opens the weapon panel on macOS", async ({ page }) => {
  test.skip(process.platform !== "darwin", "Control-click is the macOS secondary click");
  await startLocalMatch(page);
  await page.locator("#arena").dispatchEvent("pointerdown",
    { pointerType: "mouse", button: 0, ctrlKey: true, clientX: 600, clientY: 300 });
  await expect(page.locator(".native-arsenal")).toBeVisible();
});

test("girders preview the original shape at the cursor, rotate with arrows and place there", async ({ page }) => {
  await startLocalMatch(page, "fern");
  await page.keyboard.press("g");
  await expect.poll(() => page.evaluate(() => window.siege.getState().targetUtility)).toBe("girder");
  await page.evaluate(() => {
    const arena = document.querySelector("#arena");
    for (let i = 0; i < 6; i++) arena.dispatchEvent(new PointerEvent("pointermove",
      { pointerType: "mouse", bubbles: true, movementX: 10, movementY: -15, clientX: 600, clientY: 300 }));
  });
  const preview = page.locator(".native-girder-preview");
  // Worm activation selects shape 1 (grds0); the arrows step through 0x3FA.
  await expect(preview).toHaveAttribute("data-name", "grds0");
  const x = await page.evaluate(() => window.siege.debug.wormBody().x);
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  await expect(preview).toHaveAttribute("data-name", "grds4");
  // The arrows rotate the girder; they do not walk the worm.
  expect(Math.abs(await page.evaluate(() => window.siege.debug.wormBody().x) - x)).toBeLessThan(2);
  // Worm spawns vary, so try a few open spots until one accepts the girder.
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.locator("#arena").dispatchEvent("pointerdown", { pointerType: "mouse", button: 0, clientX: 5, clientY: 5 });
    await page.waitForTimeout(200);
    if (await page.evaluate(() => window.siege.getState().girders.length)) break;
    await page.evaluate(() => document.querySelector("#arena").dispatchEvent(new PointerEvent("pointermove",
      { pointerType: "mouse", bubbles: true, movementX: 40, movementY: -40, clientX: 600, clientY: 300 })));
  }
  await expect.poll(() => page.evaluate(() => window.siege.getState().girders.length)).toBe(1);
  await expect(preview).toBeHidden();
});

test("the ninja rope is selected from its row and fired with Space", async ({ page }) => {
  await startLocalMatch(page, "fern");
  await page.keyboard.press("F8");
  await expect(page.locator("#status")).toHaveText("Ninja Rope selected.");
  expect(await page.evaluate(() => window.siege.getState().rope?.firing ?? false)).toBe(false);
  await page.keyboard.press("Space");
  await expect.poll(() => page.evaluate(() => {
    const rope = window.siege.getState().rope;
    return Boolean(rope && (rope.firing || rope.attached)) || /anchor/.test(document.querySelector("#status").textContent);
  })).toBe(true);
});

test("starting a match captures the mouse; Esc releases it, a second Esc opens the menu", async ({ page }) => {
  await startLocalMatch(page, null, { keepPointerLock: true });
  const locked = () => page.evaluate(() => document.pointerLockElement?.id ?? null);
  try {
    await expect.poll(locked, { timeout: 3000 }).toBe("arena");
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
