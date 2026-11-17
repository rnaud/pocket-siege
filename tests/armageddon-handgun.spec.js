import { test, expect } from "@playwright/test";
import { nativeHitscanWeapon } from "../src/armageddon/hitscan-art.js";

test("handgun reads original resource195 bullet and burst fields", { tag: "@logic" }, () => {
  const config = nativeHitscanWeapon("handgun");
  expect(config).toMatchObject({
    total: 6, interval: 500,
    ray: { count: 1, spread: 0, range: 1920, collisionMask: 4332670 },
    resolution: { mode: 4, damage: 5, variance: 0, push: 50 },
  });
});

async function start(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(async () => { await window.siege.debug.resetSeed(42); window.siege.debug.setAmmo(0, "handgun", 1); });
  await page.locator("#inventory-toggle").click();

  await page.locator('[data-weapon="handgun"]').click();
  await page.locator("#angle").fill("90");
  await page.locator("#angle").dispatchEvent("input");
}

test("handgun fires six timed bullets for one ammo and then retreats", async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    // Sample the recorded simulation release tick, not the later render tick.
    window.bulletFrames = [];
    const sample = () => {
      const s = window.siege.getState();
      if (s.shotCount > window.bulletFrames.length) window.bulletFrames.push(s.lastShot.frame);
      if (window.bulletFrames.length < 6) window.bulletSample = requestAnimationFrame(sample);
    };
    sample();
  });
  await page.locator("#fire").click();
  await expect(page.locator("#fire")).toBeDisabled();
  await expect.poll(() => page.evaluate(() => window.siege.getState().shotCount)).toBe(6);
  await expect.poll(() => page.evaluate(() => window.siege.getState().preparing)).toBeNull();
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.ammo[0].handgun).toBe(0);
  expect(state.phase).toBe("settle");
  const frames = await page.evaluate(() => { cancelAnimationFrame(window.bulletSample); return window.bulletFrames; });
  expect(frames).toHaveLength(6);
  for (let i = 1; i < frames.length; i++) expect(frames[i] - frames[i - 1]).toBeGreaterThanOrEqual(29);
});

test("damage interrupts a spent handgun burst without firing remaining bullets", async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    // Interrupt on the first rendered shot, without a remote polling round trip.
    const interrupt = () => {
      if (window.siege.getState().shotCount >= 1) window.siege.debug.hit(0, 1);
      else requestAnimationFrame(interrupt);
    };
    requestAnimationFrame(interrupt);
  });
  await page.locator("#fire").click();
  await expect.poll(() => page.evaluate(() => window.siege.getState().preparing)).toBeNull();
  await expect.poll(() => page.evaluate(() => window.siege.getState().team)).toBe(1);
  await page.waitForTimeout(800);
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.shotCount).toBe(1);
  expect(state.ammo[0].handgun).toBe(0);
  expect(state.team).toBe(1);
});
