import { test, expect } from "@playwright/test";
import fs from "node:fs";
import crypto from "node:crypto";
import { decodeImage } from "../src/armageddon/image.js";
import { decodeSprite } from "../src/armageddon/sprite.js";
const root = new URL("../public/armageddon/", import.meta.url);
const catalog = JSON.parse(fs.readFileSync(new URL("media.json", root)));

test("every imported visual preserves its original bytes and native containers decode", () => {
  expect(catalog.assets).toHaveLength(3094);
  const counts = { img: 0, spr: 0, bmp: 0 };
  let frames = 0;
  for (const asset of catalog.assets) {
    const bytes = fs.readFileSync(new URL(asset.path, root));
    expect(bytes.length, asset.id).toBe(asset.bytes);
    expect(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      asset.id,
    ).toBe(asset.sha256);
    counts[asset.format]++;
    if (asset.format === "bmp") {
      expect(bytes.subarray(0, 2).toString(), asset.id).toBe("BM");
      continue;
    }
    const decoded = (asset.format === "img" ? decodeImage : decodeSprite)(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
    expect(decoded.width, asset.id).toBeGreaterThan(0);
    expect(decoded.height, asset.id).toBeGreaterThan(0);
    if (asset.format === "spr") {
      frames += decoded.frames.length;
      for (const frame of decoded.frames) {
        if (frame.pixels.some((index) => index >= decoded.palette.length / 4))
          throw new Error(`Invalid palette: ${asset.id}`);
      }
    }
    if (asset.format === "img" && bytes[9] === 128) {
      const offset = 16 + bytes.readUInt16LE(10) * 3;
      expect(Buffer.from(decoded.pixels), asset.id).toEqual(
        bytes.subarray(offset, offset + decoded.width * decoded.height),
      );
    }
  }
  expect(counts).toEqual({ spr: 961, img: 1217, bmp: 916 });
  expect(frames).toBe(22473);
});

test("browser decodes every original bitmap without conversion", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/armageddon.html");
  const result = await page.evaluate(async () => {
    const { assets } = await fetch("/armageddon/media.json").then((r) =>
      r.json(),
    );
    const pending = assets.filter((a) => a.format === "bmp");
    const errors = [];
    let decoded = 0;
    await Promise.all(
      Array.from({ length: 8 }, async () => {
        while (pending.length) {
          const asset = pending.pop();
          try {
            const response = await fetch("/armageddon/" + asset.path);
            if (!response.ok) throw new Error("fetch");
            const bitmap = await createImageBitmap(await response.blob());
            if (!bitmap.width || !bitmap.height) throw new Error("dimensions");
            bitmap.close();
            decoded++;
          } catch (error) {
            errors.push([asset.id, error.message]);
          }
        }
      }),
    );
    return { decoded, errors };
  });
  expect(result).toEqual({ decoded: 916, errors: [] });
});

test("complete gallery previews terrain images, uncompressed sprites and maps", async ({
  page,
}) => {
  await page.goto("/armageddon.html");
  await expect(page.locator("#media-count")).toContainText(
    "3094 original visual assets",
  );
  await page.locator("#media-group").selectOption("terrain");
  await page.locator("#media-search").fill("custom/forest/level/");
  await page
    .locator("#media-asset")
    .selectOption("custom/forest/level/soil.img");
  await expect(page.locator("#media-details")).toContainText("256 × 256");
  await page
    .locator("#media-asset")
    .selectOption("custom/forest/level/back.spr");
  await expect(page.locator("#media-details")).toContainText("back.spr");
  await page.locator("#media-group").selectOption("maps");
  await page.locator("#media-search").fill("image/cars.img");
  await expect(page.locator("#media-details")).toContainText("1920 × 696");
  expect(
    await page.locator("#media-preview").evaluate((c) =>
      c
        .getContext("2d")
        .getImageData(0, 0, c.width, c.height)
        .data.some((v) => v !== 0),
    ),
  ).toBe(true);
});

test("original terrain uses source pixels and preserves the destructible mask", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  expect(
    await page.evaluate(() => window.siege.getState().originalArtError),
  ).toBeNull();
  const result = await page.evaluate(async () => {
    const { paintOriginalTerrain } = await import("/src/armageddon/terrain.js");
    const { decodeImage, imageRGBA } = await import("/src/armageddon/image.js");
    const { Terrain, W, H } = await import("/src/physics.js");
    const soil = decodeImage(
      await fetch("/armageddon/media/level/forest/level/soil.img").then((r) =>
        r.arrayBuffer(),
      ),
    );
    const rgba = imageRGBA(soil, false);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const context = canvas.getContext("2d");
    const terrain = new Terrain(42, "highlands");
    terrain.theme = "forest";
    const x = 300,
      worldY = terrain.surface(x) - 40,
      y = H - 1 - worldY;
    paintOriginalTerrain(context, terrain);
    const actual = Array.from(context.getImageData(x, y, 1, 1).data);
    const offset = ((y % soil.height) * soil.width + (x % soil.width)) * 4;
    const expected = Array.from(rgba.slice(offset, offset + 4));
    terrain.carve(x, worldY, 12);
    paintOriginalTerrain(context, terrain);
    return {
      actual,
      expected,
      alpha: context.getImageData(x, y, 1, 1).data[3],
    };
  });
  expect(result.actual).toEqual(result.expected);
  expect(result.alpha).toBe(0);
  await page.locator("#terrain-theme").selectOption("snow");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  expect(await page.evaluate(() => window.siege.getState().terrainTheme)).toBe(
    "snow",
  );
  await page.screenshot({ path: "test-results/original-snow-terrain.png" });
});

test("original projectiles select drawn directional frames without rotating pixels", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  const result = await page.evaluate(async () => {
    const {
      createOriginalVisual,
      updateOriginalProjectile,
      projectileSprites,
      originalVisual,
    } = await import("/src/armageddon/art.js");
    return Object.entries(projectileSprites).map(([kind, name]) => {
      const mesh = createOriginalVisual(name);
      const frames = [];
      for (const [vx, vy] of [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ]) {
        updateOriginalProjectile(mesh, kind, vx, vy, 0);
        frames.push(mesh.userData.originalFrame);
      }
      const result = {
        kind,
        frames,
        rotation: mesh.rotation.z,
        width: mesh.geometry.parameters.width,
      };
      mesh.geometry.dispose();
      mesh.material.dispose();
      return result;
    });
  });
  for (const entry of result) {
    expect(entry.width).toBe(60);
    expect(entry.rotation).toBe(0);
    if (["rocket", "mortar", "homing"].includes(entry.kind))
      expect(entry.frames).toEqual([0, 8, 16, 24]);
  }
});
