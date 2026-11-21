import { test, expect } from "./helpers/shared-page.js";
import fs from "node:fs";
import { createHash } from "node:crypto";
import fixture from "./fixtures/armageddon/map-palette.json" with { type: "json" };
import { decodeImage } from "../src/armageddon/image.js";
import { NativeMapPalette } from "../src/armageddon/map-palette.js";
import { nativeMapTheme } from "../src/armageddon/map-theme.js";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const snapshot = (p) => ({
  used: p.used,
  free: p.free,
  colors: p.used.map((i) => [i, ...p.colors[i]]),
  changed: [...p.changed],
  dirty: p.dirty,
});
test("native palette allocation reuses exact colors and preserves exhaustion", { tag: "@logic" }, () => {
  for (const c of fixture.allocations) {
    const palette = new NativeMapPalette(c.first, c.last);
    expect(c.values.map((rgb) => palette.add(rgb))).toEqual(c.results);
    expect(snapshot(palette)).toEqual(c.palette);
  }
});
test("all terrain theme palettes, platforms and rim colors match original Landgen", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(87);
  for (const c of fixture.cases) {
    const source = {};
    for (const [name, expected] of Object.entries(c.images)) {
      const bytes = fs.readFileSync(
        new URL(
          `../public/armageddon/media/level/${c.theme}/level/${name}.img`,
          import.meta.url,
        ),
      );
      expect(hash(bytes)).toBe(expected.sourceSha256);
      source[name] = decodeImage(bytes);
    }
    const palette = new NativeMapPalette();
    for (const rgb of c.prefix) palette.add(rgb);
    const result = nativeMapTheme(source, c.bitmap, palette);
    expect(result.palette).toBe(palette);
    for (const [name, expected] of Object.entries(c.images)) {
      expect(
        [...result.images[name].translation],
        `${c.theme}/${name}`,
      ).toEqual(expected.translation);
      expect(hash(result.images[name].pixels)).toBe(expected.pixelsHash);
    }
    expect(snapshot(result.palette)).toEqual(c.palette);
    expect(result.rimColor).toBe(c.rimColor);
    expect(result.platform).toBe(result.images.bridge);
    const rgba = result.palette.rgba();
    for (const [index, r, g, b] of c.palette.colors)
      expect([...rgba.subarray(index * 4, index * 4 + 4)]).toEqual([
        r,
        g,
        b,
        255,
      ]);
  }
});
test("browser theme loader uses the verified assets and preserves cached loading", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { loadNativeMapTheme } = await import("/src/armageddon/map-theme.js");
    const a = loadNativeMapTheme("forest"),
      b = loadNativeMapTheme("forest");
    const theme = await a;
    return {
      same: a === b,
      rimColor: theme.rimColor,
      pixels: [...theme.platform.pixels],
    };
  });
  const expected = fixture.cases.find((c) => c.theme === "forest" && !c.bitmap);
  expect(result.same).toBe(true);
  expect(result.rimColor).toBe(expected.rimColor);
  expect(hash(Uint8Array.from(result.pixels))).toBe(
    expected.images.bridge.pixelsHash,
  );
});
