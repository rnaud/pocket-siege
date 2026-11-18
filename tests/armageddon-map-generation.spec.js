import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import indexedFixture from "./fixtures/armageddon/map-generation.json" with { type: "json" };
import packedFixture from "./fixtures/armageddon/map-generation-packed.json" with { type: "json" };
import { nativeMapFallbackMasks } from "../src/armageddon/map-fallback.js";
import { nativeGenerateMapSetup } from "../src/armageddon/map-setup.js";
const hash = (pixels) => createHash("sha256").update(pixels).digest("hex");
for (const [name, fixture] of [
  ["indexed", indexedFixture],
  ["packed", packedFixture],
])
  test(`complete ${name} map candidate sequence matches original layers, points, exclusions and RNG`, { tag: "@logic" }, () => {
    expect(fixture.cases).toHaveLength(60);
    const { width, height } = fixture;
    if (fixture.packed) {
      const masks = nativeMapFallbackMasks();
      expect([...masks.hole.pixels]).toEqual(fixture.masks.hole);
      expect([...masks.rim.pixels]).toEqual(fixture.masks.rim);
    }
    const platform = {
      width: 13,
      height: 5,
      pixels: Uint8Array.from({ length: 65 }, (_, i) =>
        ((i % 13) + Math.floor(i / 13)) % 4 ? 23 + Math.floor(i / 13) : 0,
      ),
    };
    for (const c of fixture.cases) {
      const occupied = Uint8Array.from({ length: width * height }, (_, i) => {
        const x = i % width,
          y = Math.floor(i / width);
        return Number(
          c.shape === "flat"
            ? y >= 300
            : c.shape === "solid"
              ? true
              : c.shape === "empty"
                ? false
                : c.shape === "terraces"
                  ? y % 150 >= 100
                  : y >= 180 + (Math.floor(x / 120) % 3) * 60 && x % 240 < 160,
        );
      });
      const layers = {
        color: { width, height, pixels: occupied.map((v) => (v ? 7 : 0)) },
        solid: {
          width,
          height,
          depth: fixture.packed ? 1 : 8,
          pixels: occupied,
        },
        back: {
          width,
          height,
          depth: fixture.packed ? 1 : 8,
          pixels: occupied.map((v) => (v ? (fixture.packed ? 1 : 11) : 0)),
        },
      };
      let seed = c.seed;
      const sceneMemory=new Uint8Array(0x12420);
      const result = nativeGenerateMapSetup(
        layers,
        {
          water: c.water,
          requested: c.requested,
          platform,
          rimColor: 17,
          existing: [{ x: 50, y: 50 }],
        },
        () => (seed = (Math.imul(seed, 0x19660d) + 0x3c6ef35f) >>> 0),
        {count:0,reserve:64},sceneMemory,
      );
      expect(result.points, JSON.stringify(c)).toEqual(c.ordered);
      expect(result.objects).toEqual([]);
      expect(result.spawnPool).toEqual(c.ordered.map(({x,y})=>({position:((x<<16)+y)|0,weight:1})));
      expect(new DataView(sceneMemory.buffer).getUint32(0x1241c,true)).toBe(0);
      expect(result.discovered).toEqual(c.discovered);
      expect(result.existing).toEqual(c.existing);
      expect(hash(result.grid.cells)).toBe(c.gridHash);
      expect(seed).toBe(c.randomState);
      expect(
        Object.fromEntries(
          Object.entries(layers).map(([name, image]) => [
            name,
            hash(image.pixels),
          ]),
        ),
      ).toEqual(c.hashes);
    }
  });
