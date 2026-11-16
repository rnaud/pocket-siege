import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import fixture from "./fixtures/armageddon/sprite-bounds.json" with { type: "json" };
import { decodeSprite } from "../src/armageddon/sprite.js";
import { nativeSpriteBounds } from "../src/armageddon/animation.js";

test("worm frame bounds retain the native canvas-center anchor across animation", { tag: "@logic" }, () => {
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
