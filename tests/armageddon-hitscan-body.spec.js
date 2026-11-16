import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/hitscan-body.json" with { type: "json" };
import { nativeHitscanBody } from "../src/armageddon/hitscan-body.js";
test("nearest eligible body distance matches original x86 filtering and projections", () => {
  expect(fixture.cases).toHaveLength(432);
  for (const row of fixture.cases) {
    expect(
      nativeHitscanBody(
        row.bodies,
        row.x,
        row.y,
        row.dx,
        row.dy,
        row.limit,
        row.mask,
      ).distance,
      JSON.stringify(row),
    ).toBe(row.distance);
  }
});
test("native selection keeps the nearest target and excludes the shooter", () => {
  const far = { x: 80 << 16, y: 0, type: 2 },
    near = { x: 30 << 16, y: 0, type: 2 },
    self = { x: 20 << 16, y: 0, type: 2, self: true };
  expect(nativeHitscanBody([far, near, self], 0, 0, 65536, 0, 100, -1)).toEqual(
    { distance: 30, body: near },
  );
  expect(nativeHitscanBody([near], 0, 0, 65536, 0, 30, -1)).toEqual({
    distance: -1,
    body: null,
  });
});
