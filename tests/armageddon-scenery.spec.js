import { test, expect } from "@playwright/test";
async function ready(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  expect(
    await page.evaluate(() => window.siege.getState().originalArtError),
  ).toBeNull();
}
test("native water preserves original wave pixels and repeats at the source width", async ({
  page,
}) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const { createWater } = await import("/src/water.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    const { decodeImage } = await import("/src/armageddon/image.js");
    const base = "/armageddon/media/water/blue/water/";
    const sprite = decodeSprite(
      await fetch(base + "layer/layer.spr").then((r) => r.arrayBuffer()),
    );
    const fill = decodeImage(
      await fetch(base + "fill.img").then((r) => r.arrayBuffer()),
    );
    const mesh = createWater(600, 80);
    mesh.userData.update(0);
    const canvas = mesh.material.map.image;
    const actual = canvas
      .getContext("2d")
      .getImageData(0, 0, 600, canvas.height).data;
    const source = spriteFrameRGBA(sprite, 0);
    let mismatches = 0;
    for (let y = 0; y < sprite.height; y++)
      for (let x = 0; x < 600; x++) {
        const offset = (y * sprite.width + (x % sprite.width)) * 4;
        if (!source[offset + 3]) continue;
        for (let c = 0; c < 4; c++)
          if (actual[(y * 600 + x) * 4 + c] !== source[offset + c])
            mismatches++;
      }
    const bottom = Array.from(actual.slice(-4, -1));
    const expectedFill = Array.from(
      fill.palette.slice(fill.pixels[0] * 4, fill.pixels[0] * 4 + 3),
    );
    mesh.userData.update(0.16);
    const frame = mesh.userData.originalFrame;
    mesh.userData.setLevel(120);
    mesh.userData.update(0.16);
    const result = {
      mismatches,
      bottom,
      expectedFill,
      frame,
      height: canvas.height,
      worldHeight: mesh.scale.y,
      level: mesh.userData.surfaceLevel,
    };
    mesh.geometry.dispose();
    mesh.material.map.dispose();
    mesh.material.dispose();
    return result;
  });
  expect(result.mismatches).toBe(0);
  expect(result.bottom).toEqual(result.expectedFill);
  expect(result.frame).toBe(4);
  expect(result.height).toBe(144);
  expect(result.worldHeight).toBe(144);
  expect(result.level).toBe(120);
});
test("every terrain theme renders its original backdrop at native resolution", async ({
  page,
}, testInfo) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const { paintOriginalBackdrop } =
      await import("/src/armageddon/terrain.js");
    const { default: themes } =
      await import("/src/armageddon/terrain-themes.js");
    const { decodeImage, imageRGBA } = await import("/src/armageddon/image.js");
    const failures = [];
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 650;
    const ctx = canvas.getContext("2d");
    for (const theme of themes) {
      if (!paintOriginalBackdrop(ctx, theme, 80)) {
        failures.push(theme);
        continue;
      }
      const image = decodeImage(
        await fetch(`/armageddon/media/level/${theme}/level/gradient.img`).then(
          (r) => r.arrayBuffer(),
        ),
      );
      const actual = Array.from(ctx.getImageData(0, 0, image.width, 1).data);
      const expected = Array.from(
        imageRGBA(image, false).slice(0, image.width * 4),
      );
      if (actual.some((v, i) => v !== expected[i]))
        failures.push(theme + " gradient");
    }
    return { count: themes.length, failures };
  });
  expect(result).toEqual({ count: 29, failures: [] });
  await page.locator('[data-mode="ai"]').click();
  await page.locator("#terrain-theme").selectOption("forest");
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().backdropTheme))
    .toBe("forest");
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().waterSprite))
    .toBe("water/blue/water/layer/layer.spr");
  await page.screenshot({
    path: `test-results/original-scenery-${testInfo.project.name}.png`,
  });
});

test("explosions render native debris for the selected terrain and release it", async ({
  page,
}) => {
  await ready(page);
  const pixelCheck = await page.evaluate(async () => {
    const { createTerrainDebris } = await import("/src/armageddon/terrain.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    const mesh = createTerrainDebris("snow", 2);
    const sprite = decodeSprite(
      await fetch("/armageddon/media/level/snow/level/debris.spr").then((r) =>
        r.arrayBuffer(),
      ),
    );
    const canvas = mesh.material.map.image;
    const actual = canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height).data;
    const expected = spriteFrameRGBA(sprite, 64);
    const result = {
      same: actual.every((v, i) => v === expected[i]),
      width: mesh.geometry.parameters.width,
      scale: mesh.scale.x,
    };
    mesh.geometry.dispose();
    mesh.material.dispose();
    return result;
  });
  expect(pixelCheck).toEqual({ same: true, width: 60, scale: 1 });
  await page.locator('[data-mode="ai"]').click();
  await page.locator("#terrain-theme").selectOption("snow");
  await page.locator('[data-mode="local"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  const { debris, explosions } = await page.evaluate(async () => {
    await window.siege.debug.resetSeed(42);
    const before = window.siege.getState().explosions;
    window.siege.debug.explodeAt(600, 500, "rocket");
    const state = window.siege.getState();
    return {
      debris: state.debrisSprites,
      explosions: state.explosions - before,
    };
  });
  // A barrel in range can synchronously add a second explosion. Each emits
  // 46 original fragments; both are valid and must use the selected theme.
  expect(explosions).toBeGreaterThanOrEqual(1);
  expect(debris).toHaveLength(46 * explosions);
  expect(debris.every((p) => p.theme === "snow")).toBe(true);
  await expect
    .poll(
      () => page.evaluate(() => window.siege.getState().debrisSprites.length),
      { timeout: 5000 },
    )
    .toBe(0);
});
