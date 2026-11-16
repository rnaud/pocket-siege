import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import fixture from "./fixtures/armageddon/map-fallback.json" with { type: "json" };
import {
  nativeMapFallbackMasks,
  nativeCarveMapCandidate,
  nativeMapFallback,
} from "../src/armageddon/map-fallback.js";
function layers() {
  const make = (fn) => ({
    width: 320,
    height: 240,
    pixels: Uint8Array.from({ length: 320 * 240 }, (_, i) =>
      fn(i % 320, Math.floor(i / 320)),
    ),
  });
  return {
    color: make((x, y) => 3 + ((x + y) % 11)),
    solid: make((x, y) =>
      Number(y >= 90 && (Math.floor(x / 17) + Math.floor(y / 13)) % 3 !== 0),
    ),
    back: make((x, y) => ((x + y) % 5 ? 9 : 0)),
  };
}
const hashes = (layers) =>
  Object.fromEntries(
    Object.entries(layers).map(([name, image]) => [
      name,
      createHash("sha256").update(image.pixels).digest("hex"),
    ]),
  );
test("fallback masks and all three carved layers match native Landgen pixels", { tag: "@logic" }, () => {
  const masks = nativeMapFallbackMasks();
  expect([...masks.hole.pixels]).toEqual(fixture.masks.hole);
  expect([...masks.rim.pixels]).toEqual(fixture.masks.rim);
  for (const c of fixture.carves) {
    const l = layers();
    nativeCarveMapCandidate(
      l,
      masks.hole,
      c.edge ? masks.rim : null,
      c.x,
      c.y,
      17,
    );
    expect(hashes(l), JSON.stringify(c)).toEqual(c.hashes);
  }
});
test("fallback search, RNG, carving and platform blits match original executable", { tag: "@logic" }, () => {
  const masks = nativeMapFallbackMasks();
  const platform = {
    width: 13,
    height: 5,
    pixels: Uint8Array.from({ length: 65 }, (_, i) =>
      ((i % 13) + Math.floor(i / 13)) % 4 ? 23 + Math.floor(i / 13) : 0,
    ),
  };
  expect(fixture.cases).toHaveLength(144);
  for (const c of fixture.cases) {
    const l = layers();
    let seed = c.seed;
    const result = nativeMapFallback(
      l,
      c.existing,
      {
        ...masks,
        platform,
        rimColor: 17,
        distance: 130,
        limit: c.limit,
        water: c.water,
        x: -999,
        y: -999,
      },
      () => (seed = (Math.imul(seed, 0x19660d) + 0x3c6ef35f) >>> 0),
    );
    expect(result, JSON.stringify(c)).toEqual({
      found: c.found,
      x: c.x,
      y: c.y,
    });
    expect(seed).toBe(c.randomState);
    expect(hashes(l), JSON.stringify(c)).toEqual(c.hashes);
  }
});
