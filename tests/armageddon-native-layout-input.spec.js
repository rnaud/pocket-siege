import { test, expect } from "./helpers/shared-page.js";
import { startNativeLayoutMatch as startLocalMatch } from "./helpers/scenario-page.js";

// Weapon panel and keyboard input in the native layout; the camera and
// layout cases live in armageddon-native-layout.spec.js.
// The shared fixture opts into the host control layout; these cases check
// the default desktop presentation instead.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("pocket-siege-host-layout"));
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
  const turns = () => page.evaluate(() => window.siege.getState().turnBody.turnCount);
  const before = await turns();
  await page.keyboard.press("F12");
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(10));
  expect(await turns()).toBe(before);
  await page.keyboard.press("Space");
  // Skip Go ends the turn; settle the next one in frames, not wall time.
  expect(await page.evaluate((before) => {
    for (let frames = 0; frames < 3000; frames += 10) {
      if (window.siege.getState().turnBody.turnCount > before) break;
      window.siege.debug.advanceReplayFrames(10);
    }
    return window.siege.getState().turnBody.turnCount;
  }, before)).toBe(before + 1);
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
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(10));
    if (await page.evaluate(() => window.siege.getState().girders.length)) break;
    await page.evaluate(() => document.querySelector("#arena").dispatchEvent(new PointerEvent("pointermove",
      { pointerType: "mouse", bubbles: true, movementX: 40, movementY: -40, clientX: 600, clientY: 300 })));
    // The cursor moves on the next simulation tick.
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(2));
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
