import { test, expect } from "@playwright/test";
import masks from "./fixtures/armageddon/collision-mask.json" with { type: "json" };
import fixture from "./fixtures/armageddon/collision-overlap.json" with { type: "json" };
import {
  nativeCollisionOverlap,
  nativeCollisionBitmapOverlap,
} from "../src/armageddon/collision-mask.js";
test("mask overlap matches native aligned words, clipping and reversed operands", { tag: "@logic" }, () => {
  const worm = masks.cases.find((m) => m.shape === 3);
  for (const r of fixture.cases) {
    const terrain = fixture.terrains[r.pattern];
    expect(
      r.reverse
        ? nativeCollisionOverlap(terrain, 0, 0, worm, r.x, r.y)
        : nativeCollisionOverlap(worm, r.x, r.y, terrain, 0, 0),
      JSON.stringify(r),
    ).toBe(r.result);
  }
});

test("terrain bitmap adapter matches original overlap without reading clipped pixels", { tag: "@logic" }, () => {
  const worm = masks.cases.find((m) => m.shape === 3);
  const terrains = fixture.terrains.map((terrain) => {
    const pixels = new Set(
      terrain.planes[0].points.map(([x, y]) => y * terrain.width + x),
    );
    return {
      width: terrain.width,
      height: terrain.height,
      left: 0,
      top: 0,
      solid(x, y) {
        if (x < 0 || y < 0 || x >= terrain.width || y >= terrain.height)
          throw new Error(`Unclipped terrain read ${x},${y}`);
        return pixels.has(y * terrain.width + x);
      },
    };
  });
  for (const r of fixture.cases) {
    expect(
      nativeCollisionBitmapOverlap(worm, r.x, r.y, terrains[r.pattern]),
      JSON.stringify(r),
    ).toBe(r.result);
  }
});
