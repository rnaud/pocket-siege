import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import fixture from "./fixtures/armageddon/sprite-bounds.json" with { type: "json" };
import { decodeSprite, nativeSpritePaletteMap, spriteFrameRGBA } from "../src/armageddon/sprite.js";
import { NativeGamePalette } from "../src/armageddon/game-palette.js";
import spritePalettes from "./fixtures/armageddon/sprite-palette.json" with { type: "json" };
import { nativeSpriteBounds } from "../src/armageddon/animation.js";

test("worm frame bounds retain the native canvas-center anchor across animation", { tag: "@logic" }, () => {
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
    }
    expect(palette.used.map(index => [index, palette.colors[index]])).toEqual(sequence.entries);
  }
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
