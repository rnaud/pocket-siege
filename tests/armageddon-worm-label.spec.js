import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/worm-label.json" with { type: "json" };
import { nativeWormLabelFont, nativeDamageTextPlacement, nativeWormLabelPlacement, nativeSelectionPlacement } from "../src/armageddon/worm-label.js";
import { startMatch } from "./helpers/match.js";

test("worm label font and blink match original executable", { tag: "@logic" }, () => {
  expect(fixture.arrows).toHaveLength(36);
  for (const row of fixture.arrows) expect(nativeSelectionPlacement(row.input)).toEqual(row.output);
  expect(fixture.layouts).toHaveLength(288);
  for (const row of fixture.layouts) expect(nativeWormLabelPlacement(row.input)).toEqual(row.output);
  for (const row of fixture.damage)
    expect(nativeDamageTextPlacement(row.input)).toEqual(row.output);
  for (const c of fixture.cases)
    expect(nativeWormLabelFont(c.color, c.selected, c.suppressed, c.tick)).toBe(
      c.font,
    );
});

test("live native labels blink and repaint health after damage", async ({
  page,
}, info) => {
  await startMatch(page);
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
  ).toBe(33);
  await page.screenshot({ path: info.outputPath("native-worm-labels.png") });
  // Keep the camera fixed while testing label-mode anchoring; falling crates
  // legitimately move native camera tracking during these key presses.
  await page.locator("#overview-toggle").click();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const arrow = page.locator('.worm-label.active .original-selection');
  const origin = await arrow.boundingBox();
  await page.keyboard.press('Delete'); // Name/health -> health only.
  await expect.poll(() => page.locator('.native-worm-text').first().evaluate(c => c.height)).toBe(16);
  await page.keyboard.press('Delete'); // Hidden labels must not hide selection.
  await expect(page.locator('.native-worm-text:visible')).toHaveCount(0);
  await expect(arrow).toBeVisible();
  const hidden = await arrow.boundingBox();
  expect(Math.abs(hidden.x - origin.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(hidden.y - origin.y)).toBeLessThanOrEqual(1);
  await page.locator('#label-detail').click(); // Touch-accessible control -> full detail.
  await expect.poll(() => page.locator('.native-worm-text').first().evaluate(c => c.height)).toBe(49);
  await expect(page.locator('.native-worm-text:visible')).toHaveCount(6);
  await page.keyboard.press('Delete');
  await expect.poll(() => page.locator('.native-worm-text').first().evaluate(c => c.height)).toBe(33);

});
