import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/worm-label.json" with { type: "json" };
import { nativeWormLabelFont } from "../src/armageddon/worm-label.js";

test("worm label font and blink match original executable", { tag: "@logic" }, () => {
  for (const c of fixture.cases)
    expect(nativeWormLabelFont(c.color, c.selected, c.suppressed, c.tick)).toBe(
      c.font,
    );
});

test("live native labels blink and repaint health after damage", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator(".native-worm-text")).toHaveCount(6);
  const active = page.locator(".worm-label.active");
  await expect(active).toHaveAttribute("data-native-font", "stdwht1");
  await expect(active).toHaveAttribute("data-native-font", "stdgrn1");
  await page.evaluate(() => window.siege.debug.hit(1, 10));
  await expect(
    page.locator('.worm-label[data-native-font="stdred1"]').first(),
  ).toHaveAttribute("aria-label", /90 health$/);
  expect(
    await page
      .locator(".native-worm-text")
      .first()
      .evaluate((c) => c.height),
  ).toBe(49);
  await page.screenshot({ path: info.outputPath("native-worm-labels.png") });
});
