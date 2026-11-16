import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/sight.json" with { type: "json" };
import { nativeSightTick, stepOriginalSight } from "../src/armageddon/sight.js";
test("sight easing matches original fixed point instructions", () => {
  for (const row of fixture.cases)
    expect(nativeSightTick(row.opening, row.aim, row.target)).toEqual(row.next);
});
test("sight opens on simulation ticks and resets on equip and visibility changes", () => {
  const worm = {};
  stepOriginalSight(worm, "rocket", 45, true);
  expect(worm.originalSight.opening).toBe(13107);
  for (let i = 0; i < 50; i++) stepOriginalSight(worm, "rocket", 45, true);
  expect(worm.originalSight.opening).toBeGreaterThan(65520);
  const oldAim = worm.originalSight.aim;
  stepOriginalSight(worm, "rocket", 0, true);
  expect(worm.originalSight.aim).toBeLessThan(oldAim);
  expect(worm.originalSight.aim).toBeGreaterThan(32768);
  stepOriginalSight(worm, "grenade", 0, true);
  expect(worm.originalSight.opening).toBe(13107);
  stepOriginalSight(worm, "grenade", 0, false);
  expect(worm.originalSight).toBeNull();
});

test("sight overlay stops changing while the menu pauses simulation", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.locator("#restart").click();
  const read = () =>
    page.evaluate(() => ({
      frame: document.querySelector(".original-crosshair").dataset.frameKey,
      transform: document
        .querySelector("#aim-reticle")
        .getAttribute("transform"),
    }));
  const before = await read();
  await page.waitForTimeout(150);
  expect(await read()).toEqual(before);
});
