import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/hitscan-body.json" with { type: "json" };
import { nativeHitscanBody, nativeWormHitscanBodies } from "../src/armageddon/hitscan-body.js";
test("nearest eligible body distance matches original x86 filtering and projections", { tag: "@logic" }, () => {
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
test("native selection keeps the nearest target and excludes the shooter", { tag: "@logic" }, () => {
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

test("live hitscan adapter uses native centers and current registry categories", { tag: "@logic" }, () => {
  const shooter = { x: 0, y: 80, hp: 100 };
  const standing = { x: 30, y: 80, hp: 100 };
  const hurt = { x: 40, y: 80, hp: 100, originalHurt: { state: 0x80 } };
  const airborne = { x: 50, y: 80, hp: 100, originalJump: {} };
  const frozen = { x: 60, y: 80, hp: 100, frozen: true };
  const dead = { x: 20, y: 80, hp: 0 };
  const bodies = nativeWormHitscanBodies([frozen, airborne, hurt, standing, shooter, dead], shooter, 100);
  expect(bodies.map(b => b.type)).toEqual([2,2,3,4,6]);
  for (const b of bodies) expect(b.y).toBe(20 << 16);
  for (const [type, target] of [[2,standing],[3,hurt],[4,airborne],[6,frozen]]) {
    expect(nativeHitscanBody(bodies, 0, 20, 65536, 0, 100, 1 << type).body?.worm).toBe(target);
  }
  // A centerline shot used to miss because of the obsolete 17-pixel offset.
  expect(nativeHitscanBody(bodies, 0, 20, 65536, 0, 100, -1).body?.worm).toBe(standing);
  // The native perpendicular boundary is strict: exactly sixteen pixels misses.
  expect(nativeHitscanBody(bodies, 0, 36, 65536, 0, 100, -1).body).toBeNull();
});
