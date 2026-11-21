import { test, expect } from "@playwright/test";
import { startMatch } from "./helpers/match.js";

test("all 140 original HUD icon variants preserve source pixels", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { originalHUDIcon, HUD_ICONS } =
      await import("/src/armageddon/hud-icons.js");
    const { default: names } =
      await import("/src/armageddon/hud-icon-names.json");
    const { decodeImage, imageRGBA } = await import("/src/armageddon/image.js");
    let mismatches = 0,
      count = 0;
    for (const name of names)
      for (const variant of ["hi", "lo"]) {
        const source = decodeImage(
          await fetch(`/armageddon/media/gfx/gfx/${variant}/${name}.img`).then(
            (r) => r.arrayBuffer(),
          ),
        );
        const canvas = originalHUDIcon(name, variant);
        const actual = canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data;
        const expected = imageRGBA(source);
        if (canvas.width !== source.width || canvas.height !== source.height)
          mismatches++;
        for (let i = 0; i < expected.length; i++)
          if (actual[i] !== expected[i]) mismatches++;
        count++;
      }
    return {
      count,
      mismatches,
      mapped: Object.keys(HUD_ICONS).length,
      mounted: document.querySelectorAll("canvas.original-icon").length,
      error: window.siege.getState().originalArtError,
    };
  });
  expect(result).toEqual({
    count: 140,
    mismatches: 0,
    mapped: 34,
    mounted: 34,
    error: null,
  });
});

test("arsenal and field kit use native icons with integer layout and disabled variants", async ({
  page,
}, info) => {
  await startMatch(page);
  // Random authored terrain can kill the active worm during startup. Icon
  // variants need a reproducible living actor, independent of spawn coverage.
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#inventory-toggle").click();
  await expect(page.locator('[data-weapon="rocket"]')).toBeEnabled();
  const bazooka = page.locator('[data-weapon="rocket"] canvas.original-icon');
  await expect(bazooka).toHaveAttribute("data-original-icon", "hi/bazooka");
  await page.evaluate(() => window.siege.debug.setAmmo(0, "grenade", 0));
  await expect(
    page.locator('[data-weapon="grenade"] canvas.original-icon'),
  ).toHaveAttribute("data-original-icon", "lo/grenade");
  expect(
    await bazooka.evaluate((c) => ({
      width: c.width,
      height: c.height,
      cssWidth: c.getBoundingClientRect().width,
      cssHeight: c.getBoundingClientRect().height,
    })),
  ).toEqual({ width: 32, height: 32, cssWidth: 32, cssHeight: 32 });
  await page.screenshot({
    path: info.outputPath("original-arsenal-icons.png"),
  });
  await page.locator("#inventory-toggle").click();
  await page.locator("#utilities-toggle").click();
  await expect(
    page.locator('[data-utility="rope"] canvas.original-icon'),
  ).toBeVisible();
  await expect(
    page.locator('[data-utility="rope"] canvas.original-icon'),
  ).toHaveAttribute("data-original-icon", "hi/rope");
  await page.screenshot({
    path: info.outputPath("original-field-kit-icons.png"),
  });
  await page.locator('[data-utility="parachute"]').click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().parachuteArmed))
    .toBe(true);
});
