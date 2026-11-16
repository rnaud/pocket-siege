import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/crater-rim.json" with { type: "json" };
import { nativeRimPixel } from "../src/armageddon/crater-mask.js";
test("rim pixels preserve air and unmasked colours exactly like the native bitmap blit", { tag: "@logic" }, () => {
  for (const row of fixture.cases) {
    expect(
      row.before.map((v, i) =>
        nativeRimPixel(
          (row.mask >>> i) & 1,
          (row.terrain >>> i) & 1,
          row.palette,
          v,
        ),
      ),
    ).toEqual(row.after);
  }
});
test("crater rim paints original grass palette colour without filling the hole", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { paintOriginalTerrain, originalCraterRimColor } =
      await import("/src/armageddon/terrain.js");
    const { carveNativeCrater } =
      await import("/src/armageddon/crater-mask.js");
    const { decodeImage, imageRGBA } = await import("/src/armageddon/image.js");
    const theme = window.siege.getState().terrainTheme;
    const grass = decodeImage(
      await fetch(`/armageddon/media/level/${theme}/level/grass.img`).then(
        (r) => r.arrayBuffer(),
      ),
    );
    const terrain = {
      theme,
      data: new Uint8Array(128 * 128).fill(1),
      craterRim: new Uint8Array(128 * 128),
      surface: () => 128,
    };
    carveNativeCrater(terrain.data, 128, 128, 64, 64, 25, terrain.craterRim);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    paintOriginalTerrain(ctx, terrain);
    const pixels = ctx.getImageData(0, 0, 128, 128).data;
    const color = [...originalCraterRimColor(theme)];
    let rim = 0,
      wrong = 0;
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 128; x++) {
        const i = y * 128 + x,
          offset = ((127 - y) * 128 + x) * 4;
        if (!terrain.data[i] && pixels[offset + 3]) wrong++;
        if (terrain.data[i] && terrain.craterRim[i]) {
          rim++;
          if (color.some((v, j) => pixels[offset + j] !== v)) wrong++;
        }
      }
    return {
      color,
      expected: [...imageRGBA(grass, false).slice(512, 516)],
      rim,
      wrong,
    };
  });
  expect(result.color).toEqual(result.expected);
  expect(result.rim).toBeGreaterThan(0);
  expect(result.wrong).toBe(0);
});
