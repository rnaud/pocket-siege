import { inflateSync } from "node:zlib";
import addressed from "./fixtures/armageddon/collision-overlap-memory.json" with { type: "json" };
import { nativeCollisionOverlapMemory } from "../src/armageddon/collision-mask-memory.js";
import { test, expect } from "@playwright/test";
import masks from "./fixtures/armageddon/collision-mask.json" with { type: "json" };
import fixture from "./fixtures/armageddon/collision-overlap.json" with { type: "json" };
import {
  nativeCollisionOverlap,
  nativeCollisionBitmapOverlap,
} from "../src/armageddon/collision-mask.js";
test("mask overlap matches native aligned words, clipping and reversed operands", { tag: "@logic" }, () => {
  const bytes = inflateSync(Buffer.from(addressed.memory, "base64"));
  const memory = {get: address => bytes.readUInt32LE(address - 0x3000000)};
  for (const row of addressed.cases) {
    const calls = [];
    const host = {
      bitmapDimensions(address) { calls.push(["dimensions", address]); return addressed.bitmaps[address].slice(0,2); },
      bitmapStorage(address) { calls.push(["storage", address]); const [, , pointer, stride] = addressed.bitmaps[address]; return [pointer, 1, stride]; },
    };
    const result = nativeCollisionOverlapMemory(memory, row.a, row.reverse ? 0 : row.x, row.reverse ? 0 : row.y,
      row.b, row.reverse ? row.x : 0, row.reverse ? row.y : 0, host);
    expect({result,calls}, JSON.stringify(row)).toEqual({result:row.result,calls:row.calls});
  }
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
