import { test, expect } from "@playwright/test";
import fs from "node:fs";
import {
  addNativeAmmo,
  spendNativeAmmo,
  availableNativeAmmo,
  addAmmo,
  spendAmmo,
} from "../src/armageddon/inventory.js";
import { ammoFor } from "../src/weapons.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/inventory.json", import.meta.url),
  ),
);

test("inventory matches 120 cases executed by the original x86 routines", { tag: "@logic" }, () => {
  for (const v of fixture.vectors) {
    const result =
      v.operation === "add"
        ? addNativeAmmo(v.count, v.amount)
        : v.operation === "spend"
          ? spendNativeAmmo(v.count)
          : availableNativeAmmo(v.count, v.delay, v.bypass);
    expect(result, JSON.stringify(v)).toBe(v.result);
  }
  expect(fixture.vectors).toHaveLength(120);
  expect(addAmmo(Infinity, 1)).toBe(Infinity);
  expect(spendAmmo(Infinity)).toBe(Infinity);
  expect(ammoFor({ shotgun: -1 }, "shotgun")).toBe(Infinity);
  expect(ammoFor({ rocket: 0 }, "rocket")).toBe(0);
});

test("unlimited shotgun survives both shots and remains selectable", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.evaluate(() => window.siege.debug.setAmmo(0, "shotgun", -1));
  await page.locator("#inventory-toggle").click();
  // Special weapons share the expanded arsenal panel.
  const shotgun = page.locator('[data-weapon="shotgun"]');
  await expect(shotgun).toBeEnabled();
  await expect(shotgun.locator("small")).toHaveText("∞");
  await shotgun.click();
  // Fire into clear sky: a nearby terrain hit can injure the shooter and
  // correctly cancel the second shot, independently of unlimited ammunition.
  await page.locator("#angle").fill("90");
  await page.locator("#fire").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().shotgunRemaining))
    .toBe(1);
  expect(
    await page.evaluate(() => window.siege.getState().ammo[0].shotgun),
  ).toBe(-1);
  await page.locator("#fire").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().shotgunRemaining))
    .toBe(0);
  expect(
    await page.evaluate(() => window.siege.getState().ammo[0].shotgun),
  ).toBe(-1);
});
