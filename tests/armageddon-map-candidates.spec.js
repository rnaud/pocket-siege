import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/map-candidates.json" with { type: "json" };
import {
  nativeCandidateGrid,
  nativeFindMapCandidate,
  nativeReserveCandidate,
  nativeSortMapCandidates,
  nativeMapCandidateStage,
} from "../src/armageddon/map-candidates.js";

function makeImage(shape) {
  const image = { width: 320, height: 240, pixels: new Uint8Array(320 * 240) };
  for (let y = 0; y < 240; y++)
    for (let x = 0; x < 320; x++)
      image.pixels[y * 320 + x] = Number(
        shape === "flat"
          ? y >= 175
          : shape === "slope"
            ? y >= 120 + Math.floor(x / 4)
            : shape === "cave"
              ? (y >= 55 && y < 72) || y >= 195
              : shape === "solid",
      );
  return image;
}

test("map candidate grid, search and reservations match original Landgen", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(135);
  for (const c of fixture.cases) {
    const image = makeImage(c.shape);
    const grid = nativeCandidateGrid(image);
    expect([...grid.cells], `${c.shape} occupancy`).toEqual(c.grid);
    let x = c.x,
      y = -999;
    for (const expected of c.scans) {
      const actual = nativeFindMapCandidate(image, grid, {
        x,
        y,
        water: c.water,
        attempts: c.attempts,
        width: 40,
        height: 40,
      });
      expect(
        actual,
        JSON.stringify({ shape: c.shape, water: c.water, x, y }),
      ).toEqual(expected);
      ({ x, y } = actual);
      if (actual.found) nativeReserveCandidate(grid, x - 30, y - 30, 100, 100);
    }
    expect([...grid.cells], `${c.shape} reservations`).toEqual(c.reserved);
  }
});

test("map candidate order preserves original equal-x swaps", { tag: "@logic" }, () => {
  for (const c of fixture.sorts)
    expect(nativeSortMapCandidates(c.input)).toEqual(c.output);
});

test("non-carving candidate stage matches original discovery order and RNG", { tag: "@logic" }, () => {
  expect(fixture.stages).toHaveLength(30);
  for (const c of fixture.stages) {
    const image = makeImage(c.shape),
      grid = nativeCandidateGrid(image);
    let seed = c.seed,
      draws = 0;
    const points = nativeMapCandidateStage(image, grid, c.water, () => {
      draws++;
      return (seed = (Math.imul(seed, 0x19660d) + 0x3c6ef35f) >>> 0);
    });
    expect(points, JSON.stringify(c.points)).toEqual(c.points);
    expect(seed).toBe(c.randomState);
    expect(draws).toBe(1);
    expect([...grid.cells]).toEqual(c.reserved);
  }
});
