import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/hitscan-terrain.json" with { type: "json" };
import { nativeHitscanTerrain } from "../src/armageddon/hitscan-terrain.js";
test("terrain ray visits the exact original pixels and returns the original distance", () => {
  expect(fixture.cases).toHaveLength(400);
  for (const row of fixture.cases) {
    const queries = [];
    const distance = nativeHitscanTerrain(
      row.x,
      row.y,
      row.dx,
      row.dy,
      row.limit,
      (x, y) => {
        queries.push([x, y]);
        return {
          empty: false,
          wall: x === 5,
          floor: y === 5,
          pixel: x === 3 && y === 3,
          negative: x < 0 || y < 0,
        }[row.shape];
      },
    );
    expect({ distance, queries }).toEqual({
      distance: row.distance,
      queries: row.queries,
    });
  }
});
test("terrain ray catches thin distant walls and includes the muzzle and range boundary", () => {
  expect(nativeHitscanTerrain(0, 0, 65536, 0, 1920, (x) => x === 1001)).toBe(
    1001,
  );
  expect(nativeHitscanTerrain(0, 0, 65536, 0, 1920, (x) => x === 1920)).toBe(
    1920,
  );
  expect(nativeHitscanTerrain(0, 0, 65536, 0, 1920, (x) => x === 0)).toBe(0);
  expect(nativeHitscanTerrain(0, 0, 65536, 0, 1920, () => false)).toBe(-1);
});
