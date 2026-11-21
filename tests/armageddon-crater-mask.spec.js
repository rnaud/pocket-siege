import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/crater-mask.json" with { type: "json" };
import {
  nativeCirclePixels,
  nativeCraterMask,
  carveNativeCrater,
} from "../src/armageddon/crater-mask.js";
test("all sixteen crater hole and rim masks match original pixel writes", { tag: "@logic" }, () => {
  for (const row of fixture.cases) {
    const pixels = new Map();
    const write = (x, y, value) =>
      value ? pixels.set(`${x},${y}`, [x, y]) : pixels.delete(`${x},${y}`);
    const rows = () =>
      [...new Set([...pixels.values()].map((p) => p[1]))]
        .sort((a, b) => a - b)
        .map((y) => [
          y,
          [...pixels.values()]
            .filter((p) => p[1] === y)
            .map((p) => p[0])
            .sort((a, b) => a - b),
        ]);
    nativeCirclePixels(row.inner, write);
    expect(rows()).toEqual(row.hole);
    pixels.clear();
    nativeCirclePixels(row.outer, write);
    nativeCirclePixels(row.inner, write, 0);
    expect(rows()).toEqual(row.rim);
    expect(nativeCraterMask(Math.ceil((row.index * 100) / 15))).toEqual({
      index: row.index,
      inner: row.inner,
      outer: row.outer,
    });
  }
});
test("crater stamping clips the original pixels and counts each removed pixel once", { tag: "@logic" }, () => {
  const data = new Uint8Array(64 * 64).fill(1);
  const expected = fixture.cases[3].hole.reduce(
    (n, [y, xs]) => n + xs.filter((x) => x >= 0 && y >= 0).length,
    0,
  );
  expect(carveNativeCrater(data, 64, 64, 0, 64, 25)).toBe(expected);
  expect(carveNativeCrater(data, 64, 64, 0, 64, 25)).toBe(0);
  expect(nativeCraterMask(-1).index).toBe(0);
  expect(nativeCraterMask(101).index).toBe(15);
});
