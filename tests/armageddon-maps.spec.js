import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { OriginalMapTerrain } from "../src/armageddon/maps.js";
import { decodeImage } from "../src/armageddon/image.js";

const catalog = JSON.parse(fs.readFileSync("public/armageddon/media.json"));
const maps = catalog.assets.filter((asset) => asset.group === "maps");
function read(asset) {
  const bytes = fs.readFileSync(`public/armageddon/${asset.path}`);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

test("all 100 authored maps retain full source pixels and collision orientation", () => {
  expect(maps).toHaveLength(100);
  for (const asset of maps) {
    const buffer = read(asset),
      source = decodeImage(buffer);
    const terrain = new OriginalMapTerrain(buffer, asset.id);
    expect([terrain.width, terrain.height]).toEqual([1920, 696]);
    let mismatches = 0,
      solids = 0;
    for (let i = 0; i < source.pixels.length; i++) {
      const index = source.pixels[i],
        x = i % source.width;
      const y = source.height - 1 - Math.floor(i / source.width);
      if (terrain.solid(x, y) !== (index !== 0)) mismatches++;
      if (index) solids++;
      for (let c = 0; c < 4; c++) {
        const expected = index ? source.palette[index * 4 + c] : 0;
        if (terrain.pixels[i * 4 + c] !== expected) mismatches++;
      }
    }
    expect(mismatches, asset.id).toBe(0);
    expect(solids, asset.id).toBeGreaterThan(0);
    expect(terrain.solid(-1, 0)).toBe(false);
    expect(terrain.solid(1920, 0)).toBe(false);
    expect(terrain.solid(0, 696)).toBe(false);
  }
});

test("map destruction clears artwork and collision together without changing source or other pixels", () => {
  const buffer = read(maps[0]);
  const originalBytes = new Uint8Array(buffer).slice();
  const terrain = new OriginalMapTerrain(buffer);
  const before = terrain.pixels.slice();
  const cx = 960,
    cy = terrain.surface(960) - 12,
    radius = 35;
  expect(terrain.carve(cx, cy, radius)).toBeGreaterThan(0);
  let mismatch = 0;
  for (let y = 0; y < terrain.height; y++) {
    for (let x = 0; x < terrain.width; x++) {
      const inside = (x - cx) ** 2 + (y - cy) ** 2 < radius ** 2;
      const offset = ((terrain.height - 1 - y) * terrain.width + x) * 4;
      for (let c = 0; c < 4; c++)
        if (terrain.pixels[offset + c] !== (inside ? 0 : before[offset + c]))
          mismatch++;
      if (inside && terrain.solid(x, y)) mismatch++;
    }
  }
  expect(mismatch).toBe(0);
  expect(new Uint8Array(buffer)).toEqual(originalBytes);
  expect(terrain.carve(cx, cy, radius)).toBe(0);
});

test("authored map is playable at full size and switching back restores the host world", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#map-layout").selectOption("original:image/artclass.img");
  await page.locator("#start").click();
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.mapLayout).toBe("original:image/artclass.img");
  expect(state.world).toEqual({ width: 1920, height: 696 });
  expect(state.worms).toHaveLength(6);
  expect(state.worms.every((w) => w.hp === 100 && w.y > state.waterLevel)).toBe(
    true,
  );
  await page.screenshot({ path: info.outputPath("original-artclass-map.png") });
  await page.evaluate(() => window.siege.debug.explodeAt(960, 350, "cluster"));
  await page.evaluate(() => {
    document.querySelector("#map-layout").value = "fern";
    window.siege.debug.resetSeed(42);
  });
  expect((await page.evaluate(() => window.siege.getState())).world).toEqual({
    width: 1200,
    height: 650,
  });
});
