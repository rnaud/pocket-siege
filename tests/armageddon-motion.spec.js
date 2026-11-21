import { test, expect } from "./helpers/shared-page.js";
import fs from "node:fs";
import {
  nativeAirForces,
  nativeSweep,
  nativeSimpleBounce,
  nativeWaterMotion,
  nativeSimpleBodyTick,
  nativeBodyAwake,
} from "../src/armageddon/motion.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/motion.json", import.meta.url),
  ),
);
function collision(shape, queries) {
  return (x, y) => {
    queries.push([x, y]);
    x >>= 16;
    y >>= 16;
    return {
      empty: false,
      right: x >= 5,
      left: x < 0,
      floor: y >= 5,
      ceiling: y < 0,
      pixel: x === 3 && y === 3,
    }[shape]
      ? 7
      : 0;
  };
}
test("pixel sweeps match original positions, contacts, time fractions and query order", { tag: "@logic" }, () => {
  expect(fixture.sweeps).toHaveLength(432);
  for (const v of fixture.sweeps) {
    const queries = [];
    const result = nativeSweep(
      { x: v.start[0], y: v.start[1], vx: v.velocity[0], vy: v.velocity[1] },
      v.fraction,
      collision(v.shape, queries),
    );
    expect(result, JSON.stringify(v)).toEqual({
      x: v.position[0],
      y: v.position[1],
      remaining: v.remaining,
      side: v.side,
      hit: v.hit,
    });
    expect(queries).toEqual(v.queries);
  }
});
test("airborne force application matches original gravity, wind, drag and support queries", { tag: "@logic" }, () => {
  expect(fixture.forces).toHaveLength(432);
  for (const v of fixture.forces) {
    const queries = [];
    const result = nativeAirForces(
      {
        x: 4 << 16,
        y: 4 << 16,
        vx: v.velocity[0],
        vy: v.velocity[1],
        gravityScale: v.scale,
        windScale: v.scale,
        drag: v.drag,
      },
      v.gravity,
      v.wind,
      collision(v.shape, queries),
    );
    expect(result, JSON.stringify(v)).toEqual({
      vx: v.velocity_out[0],
      vy: v.velocity_out[1],
      moving: v.moving,
      result: v.result,
    });
    expect(queries).toEqual(v.queries);
  }
});

test("browser sweep catches a one-pixel wall and retains its collision identity", { tag: "@logic" }, async () => {
  const { sweepProjectile } = await import("../src/physics.js");
  const queries = [];
  const result = sweepProjectile(
    { x: 0.25, y: 100 },
    { x: 20.25, y: 100 },
    (x, y) => {
      queries.push([x, y]);
      return Math.floor(x) === 5 ? 77 : 0;
    },
  );
  expect(result.hit).toBe(77);
  expect(result.x).toBeLessThan(5);
  expect(result.x).toBeGreaterThan(4.99);
  expect(result.y).toBe(100);
  expect(result.remaining).toBeGreaterThan(0);
  expect(queries.some(([x]) => Math.floor(x) === 5)).toBe(true);
});

test("simple-body bounce matches original axis response and both velocity cutoffs", { tag: "@logic" }, () => {
  expect(fixture.bounces).toHaveLength(960);
  for (const v of fixture.bounces) {
    const result = nativeSimpleBounce(
      {
        vx: v.velocity[0],
        vy: v.velocity[1],
        restitutionX: v.coefficients[0],
        restitutionY: v.coefficients[1],
        tangent: v.coefficients[2],
      },
      { vx: v.other_velocity[0], vy: v.other_velocity[1] },
      v.side,
    );
    expect(result, JSON.stringify(v)).toEqual({
      body: { vx: v.velocity_out[0], vy: v.velocity_out[1] },
      other: { vx: v.other_velocity_out[0], vy: v.other_velocity_out[1] },
    });
  }
});

test("water entry and skimming match original thresholds, event and collision queries", { tag: "@logic" }, () => {
  expect(fixture.water).toHaveLength(224);
  for (const v of fixture.water) {
    const queries = [];
    const result = nativeWaterMotion(
      {
        flags: v.flags,
        x: 4 << 16,
        y: v.y,
        vx: v.velocity[0],
        vy: v.velocity[1],
        skimScale: 65536,
        waterDrag: 0xcccc,
      },
      5,
      v.suppress,
      collision(v.shape, queries),
    );
    expect(result, JSON.stringify(v)).toEqual({
      y: v.y_out,
      vx: v.velocity_out[0],
      vy: v.velocity_out[1],
      submerged: v.submerged,
      skim: v.skim,
      result: v.result,
    });
    expect(queries).toEqual(v.queries);
  }
});

test("simple-body tick matches native force, water, two-contact, rotation and sleep ordering", { tag: "@logic" }, () => {
  expect(fixture.ticks).toHaveLength(192);
  for (const v of fixture.ticks) {
    const queries = [],
      events = [];
    let skims = 0;
    const predicate = collision(v.shape, queries);
    const result = nativeSimpleBodyTick(
      v.initial,
      {
        frame: v.frame,
        index: 0,
        waterY: 3,
        gravity: 0x3d70,
        wind: 1024,
      },
      {
        collide: (x, y) => (predicate(x, y) ? 0x2004000 : 0),
        awake: () => {
          events.push("awake");
          return v.awake;
        },
        skim: () => {
          skims++;
        },
        waterChanged: () => {
          events.push("water");
        },
        bounce: (body, hit, side) =>
          Object.assign(
            body,
            nativeSimpleBounce(body, { vx: 0, vy: 0 }, side).body,
          ),
      },
    );
    expect(result, JSON.stringify(v)).toEqual(v.output);
    expect(queries).toEqual(v.queries);
    expect(events).toEqual(v.events);
    expect(skims).toBe(v.skims);
  }
});

test("native wake predicate matches all combinations of motion flags", { tag: "@logic" }, () => {
  expect(fixture.awake).toHaveLength(32);
  for (const v of fixture.awake) {
    const [vx, vy, submerged, contact, moving] = v.values;
    expect(nativeBodyAwake({ vx, vy, submerged, contact, moving })).toBe(
      v.result,
    );
  }
});
