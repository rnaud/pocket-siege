import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/hud-frame.json" with { type: "json" };
import { nativeHUDFrame } from "../src/armageddon/hud-frame.js";
test("HUD frame drawing matches original executable requests", () => {
  for (const c of fixture.cases)
    expect(nativeHUDFrame(c.width, c.height, 11, 22, 33)).toEqual(c.calls);
});
test("live native team bars update with damage and keep HUD controls usable", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator(".native-team-health").first()).toHaveAttribute(
    "data-native-health",
    "100",
  );
  await page.evaluate(() => window.siege.debug.hit(1, 10));
  await expect(page.locator(".native-team-health").nth(1)).toHaveAttribute(
    "data-native-health",
    "90",
  );
  await expect(page.locator("#fire")).toBeEnabled();
  await expect(page.locator("#timer")).toBeInViewport();
  await expect(page.locator("#wind")).toBeInViewport();
  await page.screenshot({ path: info.outputPath("native-hud.png") });
});
