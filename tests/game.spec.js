import { test, expect } from "@playwright/test";
import { Terrain } from "../src/physics.js";
test("terrain craters remove solid ground and preserve distant terrain", () => {
  const t = new Terrain(42),
    x = 400,
    y = t.surface(x) - 15;
  expect(t.solid(x, y)).toBe(true);
  const other = t.surface(800);
  expect(t.carve(x, y, 50)).toBeGreaterThan(1000);
  expect(t.solid(x, y)).toBe(false);
  expect(t.surface(800)).toBe(other);
  expect(t.carve(x, y, 50)).toBe(0);
});
test("play a full destructive turn with responsive controls", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator("#menu")).not.toBeVisible();
  await expect(page.locator("#fire")).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const before = await page.evaluate(() => window.siege.getState());
  await page.locator("#angle").fill("90");
  await page.locator("#power").fill("15");
  await page.locator("#fire").click();
  await expect
    .poll(async () => page.evaluate(() => window.siege.getState().team), {
      timeout: 20000,
    })
    .toBe(1);
  const after = await page.evaluate(() => window.siege.getState());
  expect(after.explosions).toBeGreaterThan(0);
  expect(after.terrainPixels).toBeLessThan(before.terrainPixels);
  await page.screenshot({
    path: `test-results/${info.project.name}-game.png`,
    fullPage: true,
  });
  await page.locator('[data-weapon="grenade"]').click();
  await page.locator("#angle").fill("90");
  await page.locator("#power").fill("15");
  await page.locator("#fire").click();
  await expect
    .poll(async () => page.evaluate(() => window.siege.getState().team), {
      timeout: 20000,
    })
    .toBe(0);
  expect(errors).toEqual([]);
});
test("computer takes its turn and returns control", async ({ page }) => {
  await page.goto("/");
  await page.locator("#start").click();
  await page.locator("#angle").fill("90");
  await page.locator("#power").fill("15");
  await page.locator("#fire").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().team), {
      timeout: 18000,
    })
    .toBe(1);
  await expect(page.locator("#fire")).toBeDisabled();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().round), {
      timeout: 25000,
    })
    .toBe(2);
  await expect(page.locator("#fire")).toBeEnabled();
});
test("movement, jump, touch aiming, and landscape layout", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator("#start").click();
  const before = await page.evaluate(() => window.siege.getState().worms[0]);
  await page.locator('[data-move="1"]').scrollIntoViewIfNeeded();
  const button = await page.locator('[data-move="1"]').boundingBox();
  await page.mouse.move(
    button.x + button.width / 2,
    button.y + button.height / 2,
  );
  await page.mouse.down();
  await expect
    .poll(async () => page.evaluate(() => window.siege.getState().worms[0].x))
    .toBeGreaterThan(before.x + 6);
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().worms[0].ground))
    .toBe(true);
  const jumpY = await page.evaluate(() => window.siege.getState().worms[0].y);
  await page.locator("#jump").click();
  await expect
    .poll(async () => page.evaluate(() => window.siege.getState().worms[0].y))
    .toBeGreaterThan(jumpY + 10);
  const field = await page.locator("#arena").boundingBox();
  if (info.project.name === "iphone")
    await page.touchscreen.tap(
      field.x + field.width * 0.7,
      field.y + field.height * 0.2,
    );
  else
    await page.mouse.click(
      field.x + field.width * 0.7,
      field.y + field.height * 0.2,
    );
  expect(await page.locator("#angle").inputValue()).not.toBe("45");
  if (info.project.name === "iphone") {
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator("#fire")).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/iphone-landscape.png",
      fullPage: true,
    });
  }
});
