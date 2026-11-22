import { test, expect } from "./helpers/shared-page.js";
// The layout test needs its own storage, which a shared page cannot take.
import { test as freshTest } from "@playwright/test";
import fixture from "./fixtures/armageddon/worm-icon.json" with { type: "json" };
import { nativeWormIconUpdate, nativeWormIconDraw, nativeWormIconPanel } from "../src/armageddon/worm-icon.js";

// The oracle's scene icon table holds 0x7000 + slot and palette colour n is 0x100 + n.
const icon = (slot) => 0x7000 + slot;
const palette = (n) => 0x100 + n;

test("weapon icon choice matches the original executable", { tag: "@logic" }, () => {
  expect(fixture.update).toHaveLength(441);
  for (const { input, output } of fixture.update) expect(nativeWormIconUpdate(input, icon)).toEqual(output);
});

test("weapon icon draw request matches the original executable", { tag: "@logic" }, () => {
  expect(fixture.draws).toHaveLength(192);
  for (const { input, calls } of fixture.draws) {
    const draw = nativeWormIconDraw(input);
    if (!calls.length) { expect(draw).toBeNull(); continue; }
    expect(["panel", draw.image, draw.progress, palette(draw.border), palette(draw.fill)]).toEqual(calls[0]);
    // 004C4180 image record: order, x, y, z, image, source x/y, width, height, flags.
    expect(calls[1]).toEqual(["queue", draw.order, draw.x, draw.y, 0, 0x6666, 0, 0,
      input.panelSize, input.panelSize, 0]);
  }
});

test("weapon icon panel crops, frames and caches like the original", { tag: "@logic" }, () => {
  const names = { "0x3c": "fill", "0x34": "hline", "0x38": "vline", "0x58": "pixel", "0x4c": "blit" };
  expect(fixture.panels.flat()).toHaveLength(11);
  for (const steps of fixture.panels) {
    const cache = {};
    for (const { input, output, calls } of steps) {
      const panel = nativeWormIconPanel(cache, input.image, input.progress, input.border, input.fill);
      expect([panel.width, panel.height]).toEqual([output.width, output.height]);
      expect(panel.calls).toEqual(calls.map(([method, ...args]) => [names[method], ...args]));
    }
  }
});

freshTest.describe("original desktop layout", () => {
  // The stored host layout preference would bypass the equipped panel items.
  freshTest.use({ storageState: { cookies: [], origins: [] } });

  freshTest("holding out an instant utility floats its icon and drops the crosshair", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.siege?.getState().assetsReady);
    await page.evaluate(() => window.siege.debug.startMatch({ map: "fern", seed: 42, manualClock: true }));
    const icon = () => page.evaluate(() => {
      const s = window.siege.getState(), w = s.worms[s.current];
      const canvas = document.querySelector(".worm-label.active .original-weapon-icon");
      return { ...w.weaponIcon, label: w.selectionLabel, drawn: Boolean(canvas && !canvas.hidden),
        size: canvas && !canvas.hidden ? [canvas.width, canvas.height] : null, sprite: w.originalSprite,
        crosshair: getComputedStyle(document.querySelector("#aim-guide")).display !== "none" };
    });
    // A bazooka never shows an icon.
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(40));
    expect(await icon()).toMatchObject({ drawn: false, crosshair: true });
    expect((await icon()).sprite).toMatch(/^wbaz/);
    // Low Gravity (slot 63) is equipped; after 25 still ticks the weapon is out.
    await page.evaluate(() => window.siege.debug.equipSlot(63));
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(80));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
    const shown = await icon();
    expect(shown).toMatchObject({ slot: 63, progress: 0x10000, target: 0x10000, label: 0, drawn: true, size: [30, 30] });
    // The worm holds the utility (wutllnk, then its link) and has no crosshair (+0x27C = 0).
    expect(shown.sprite).toMatch(/^wutl/);
    expect(shown.crosshair).toBe(false);
    // Back to the bazooka: the icon is cleared and the label slides back.
    await page.evaluate(() => window.siege.debug.equipSlot(1));
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(80));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
    expect(await icon()).toMatchObject({ slot: 0, progress: 0, drawn: false, crosshair: true });
  });
});
