import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import fixture from "./fixtures/armageddon/sprite-bounds.json" with { type: "json" };
import { decodeSprite, nativeSpritePaletteMap, spriteFrameRGBA } from "../src/armageddon/sprite.js";
import { NativeGamePalette } from "../src/armageddon/game-palette.js";
import spritePalettes from "./fixtures/armageddon/sprite-palette.json" with { type: "json" };
import startupPalette from "./fixtures/armageddon/startup-palette.json" with { type: "json" };
import { decodeNativeFont } from "../src/armageddon/font.js";
import { nativeStartupPalette } from "../src/armageddon/startup-palette.js";
import spritePaletteData from "../src/armageddon/sprite-palette-data.json" with { type: "json" };
import { nativeSpriteBounds } from "../src/armageddon/animation.js";

test("worm frame bounds retain the native canvas-center anchor across animation", { tag: "@logic" }, () => {
  const startup = new NativeGamePalette(0, 104);
  startup.add([0, 0, 0]);
  const loaded = new Map();
  for (const row of startupPalette.steps.filter(row => row.path)) {
    const bytes = readFileSync(new URL(`../${row.path}`, import.meta.url));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(row.sha256);
    loaded.set(row.path, (row.kind === "font" ? decodeNativeFont : decodeSprite)(bytes));
  }
  const startupSteps = [];
  const entries = palette => palette.used.map(index => [index, [...palette.colors[index]]]);
  const result = nativeStartupPalette(startup,
    name => loaded.get(`public/armageddon/sprites/${name}.spr`),
    name => loaded.get(`public/armageddon/fonts/${name}.fnt`),
    (kind, id, name, palette) => startupSteps.push({ kind, id, entries: entries(palette) }));
  expect(startupSteps).toEqual(startupPalette.steps.map(({ kind, id = null, entries }) => ({ kind, id, entries })));
  expect(entries(startup)).toEqual(startupPalette.entries);
  expect(result.teamIndices).toEqual(startupPalette.teamIndices);
  for (const sequence of spritePalettes.cases) {
    const palette = new NativeGamePalette(sequence.first, sequence.last);
    if (sequence.black) palette.add([0, 0, 0]);
    for (const row of sequence.sprites) {
      const bytes = readFileSync(new URL(`../${row.path}`, import.meta.url));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(row.sha256);
      const sprite = decodeSprite(bytes);
      const mapping = nativeSpritePaletteMap(sprite, palette);
      expect(Array.from(mapping), row.name).toEqual(row.mapping);
      // Indexed rendering must preserve transparent pixels and original RGB
      // while allowing the shared bank colors to change independently.
      expect(Buffer.from(spriteFrameRGBA(sprite, 0, { mapping, colors: palette.colors })))
        .toEqual(Buffer.from(spriteFrameRGBA(sprite, 0)));
      if (sequence.black) {
        expect(spritePaletteData.sprites[row.name].map(index => spritePaletteData.colors[index]))
          .toEqual(Array.from({ length: sprite.palette.length / 4 - 1 }, (_, index) => Array.from(sprite.palette.slice(index * 4 + 4, index * 4 + 7))));
        const startupMapping = nativeSpritePaletteMap(sprite, startup);
        expect(startupMapping.includes(255), row.name).toBe(false);
        expect(Buffer.from(spriteFrameRGBA(sprite, 0, { mapping: startupMapping, colors: startup.colors })))
          .toEqual(Buffer.from(spriteFrameRGBA(sprite, 0)));
      }
    }
    expect(palette.used.map(index => [index, palette.colors[index]])).toEqual(sequence.entries);
  }
  expect(startup.used).toHaveLength(105);
  for (const c of fixture.cases) {
    const bytes = readFileSync(
      new URL(`../public/armageddon/sprites/${c.name}.spr`, import.meta.url),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);
    const sprite = decodeSprite(bytes);
    for (const { progress, ...bounds } of c.samples)
      expect(
        nativeSpriteBounds(sprite, progress),
        `${c.name}: ${progress}`,
      ).toEqual(bounds);
  }
});
