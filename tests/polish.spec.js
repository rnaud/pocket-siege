import { test, expect } from "@playwright/test";
import { Terrain, W, H } from "../src/physics.js";
import { cameraView } from "../src/camera.js";
test("portrait camera preserves world proportions and clamps to map", { tag: "@logic" }, () => {
  const v = cameraView(100, 350, 1, 0.6);
  expect(v.w / v.h).toBeCloseTo(0.6);
  expect(v.x).toBe(0);
  expect(cameraView(1200, 350, 1, 0.6).x + v.w).toBe(W);
});
test("shelters have physical roofs and open entrances, offshore cleft separates land", { tag: "@logic" }, () => {
  const t = new Terrain(42),
    solid = (x, y) => t.solid((x / 480) * W, ((270 - y) / 270) * H);
  expect(solid(90, 179)).toBe(false);
  expect(solid(90, 155)).toBe(true);
  expect(solid(380, 178)).toBe(false);
  expect(solid(380, 160)).toBe(true);
  expect(solid(452, 200)).toBe(false);
  expect(solid(465, 200)).toBe(true);
});
test("compact arsenal, overview and charge work across layouts", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator(".weapon-panel")).not.toBeVisible();
  await page.locator("#inventory-toggle").click();
  await expect(page.locator(".weapon-panel")).toBeVisible();
  await page.locator('[data-weapon="grenade"]').click();
  await expect(page.locator(".weapon-panel")).not.toBeVisible();
  await page.keyboard.down("Space");
  await page.waitForTimeout(450);
  await expect(page.locator("#worm-charge")).toBeVisible();
  await page.keyboard.up("Space");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#arena")).toHaveClass(/portrait-camera/);
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector("#arena").clientHeight),
    )
    .toBeGreaterThan(450);
  await page.locator("#overview-toggle").click();
  await expect(page.locator("#arena")).not.toHaveClass(/portrait-camera/);
  await page.locator("#overview-toggle").click();
  await expect(page.locator("#arena")).toHaveClass(/portrait-camera/);
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: `test-results/${info.project.name}-polish-portrait.png`,
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `test-results/${info.project.name}-polish-desktop.png`,
  });
  expect(errors).toEqual([]);
});

test("menu portraits use original sprites", async ({page}) => {
  await page.goto('/');
  await page.waitForFunction(()=>window.siege?.getState().assetsReady);
  const portraits=page.locator('canvas[data-art="soldier"]');
  for (const canvas of await portraits.all())
    await expect(canvas).toHaveAttribute('data-original-sprite','wblink1');
});
