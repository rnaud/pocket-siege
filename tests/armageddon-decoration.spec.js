import { test, expect } from "@playwright/test";

test("all themes place deterministic, destructible original object pixels", async ({
  page,
}) => {
  test.setTimeout(120000); // Full pixel comparisons across every imported terrain theme.
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const results = await page.evaluate(async () => {
    const { Terrain, W, H } = await import("/src/physics.js");
    const { loadOriginalDecorations, placeOriginalDecorations } =
      await import("/src/armageddon/terrain-decoration.js");
    const { paintOriginalTerrain } = await import("/src/armageddon/terrain.js");
    const { decodeImage, imageRGBA } = await import("/src/armageddon/image.js");
    const { default: themes } =
      await import("/src/armageddon/terrain-themes.js");
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const results = [];
    for (const theme of themes) {
      await loadOriginalDecorations(theme);
      const terrain = new Terrain(42);
      terrain.theme = theme;
      const original = terrain.data.slice();
      const placements = placeOriginalDecorations(terrain, W, H);
      const repeat = new Terrain(42);
      repeat.theme = theme;
      const deterministic =
        JSON.stringify(placements) ===
        JSON.stringify(placeOriginalDecorations(repeat, W, H));
      paintOriginalTerrain(ctx, terrain);
      const rendered = ctx.getImageData(0, 0, W, H).data;
      let pixels = 0,
        mismatches = 0,
        removed = 0;
      for (const object of placements) {
        const image = decodeImage(
          await fetch(
            `/armageddon/media/level/${theme}/level/${object.name}.img`,
          ).then((r) => r.arrayBuffer()),
        );
        const rgba = imageRGBA(image);
        for (let y = 0; y < image.height; y++)
          for (let x = 0; x < image.width; x++) {
            const source =
              y * image.width + (object.mirrored ? image.width - 1 - x : x);
            const target = (object.y + y) * W + object.x + x;
            const collision = (H - 1 - object.y - y) * W + object.x + x;
            if (!image.pixels[source] || original[collision]) continue;
            pixels++;
            if (!terrain.data[collision]) mismatches++;
            for (let c = 0; c < 4; c++)
              if (rendered[target * 4 + c] !== rgba[source * 4 + c])
                mismatches++;
            terrain.data[collision] = 0;
          }
      }
      paintOriginalTerrain(ctx, terrain);
      const carved = ctx.getImageData(0, 0, W, H).data;
      for (let i = 0; i < W * H; i++)
        if (terrain.decorationPixels[i * 4 + 3] && !carved[i * 4 + 3])
          removed++;
      results.push({
        theme,
        count: placements.length,
        pixels,
        mismatches,
        deterministic,
        removed,
      });
    }
    return results;
  });
  for (const result of results) {
    expect(result.mismatches, result.theme).toBe(0);
    expect(result.deterministic, result.theme).toBe(true);
    expect(result.count, result.theme).toBeGreaterThan(0);
    expect(result.pixels, result.theme).toBeGreaterThan(0);
    expect(result.removed, result.theme).toBe(result.pixels);
  }
});

test("selected theme loads before starting the decorated match", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.locator("#terrain-theme").selectOption("forest");
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().terrainDecorations.length),
    )
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(() => window.siege.getState().originalArtError),
  ).toBeNull();
  await page.screenshot({
    path: testInfo.outputPath("original-map-objects.png"),
  });
});
