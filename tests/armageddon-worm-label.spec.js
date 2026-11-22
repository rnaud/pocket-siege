import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/worm-label.json" with { type: "json" };
import slide from "./fixtures/armageddon/worm-selection-slide.json" with { type: "json" };
import { nativeWormLabelFont, nativeDamageTextPlacement, nativeWormLabelPlacement, nativeSelectionPlacement, nativeSelectionEase } from "../src/armageddon/worm-label.js";
import { startMatch, renderedFrame } from "./helpers/match.js";

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

// One 004D9DFA..004D9EF5 frame: label slide, then arrow slide.
const slideFrame = (state) => ({ ...state, arrow: nativeSelectionEase(state.arrow, state.arrowTarget),
  label: nativeSelectionEase(state.label, state.labelTarget) });

test("selection arrow and label slides match the original executable", { tag: "@logic" }, () => {
  expect(slide.frames).toHaveLength(64);
  for (const row of slide.frames) expect(slideFrame(row.input)).toEqual(row.output);
  for (const sequence of slide.sequences) {
    let state = sequence.input;
    for (const step of sequence.steps) expect(state = slideFrame(state)).toEqual(step);
  }
});

test("the selection arrow leaves on the first input and returns after 500 idle ticks", async ({ page }) => {
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  const arrow = () => page.evaluate(() => {
    const s = window.siege.getState(), w = s.worms[s.current];
    return { arrow: w.selectionArrow, label: w.selectionLabel,
      drawn: !document.querySelector(".worm-label.active .original-selection")?.hidden };
  });
  await renderedFrame(page);
  expect(await arrow(page)).toEqual({ arrow: 0x10000, label: 0x10000, drawn: true });
  // Aiming is the first input: both slide away over the next frames.
  await page.locator("#angle").evaluate((el) => { el.value = "50"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(60));
  await renderedFrame(page);
  expect(await arrow(page)).toEqual({ arrow: 0, label: 0, drawn: false });
  // A still worm brings both back after 500 ticks.
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(440));
  expect((await arrow(page)).arrow).toBe(0);
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(120));
  await renderedFrame(page);
  expect(await arrow(page)).toEqual({ arrow: 0x10000, label: 0x10000, drawn: true });
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
