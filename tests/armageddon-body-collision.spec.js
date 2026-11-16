import { test, expect } from "@playwright/test";
import fs from "node:fs";
import {
  nativeBodyCollision,
  nativeWormProjectileCollision,
} from "../src/armageddon/body-collision.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/body-collision.json", import.meta.url),
  ),
);
test("two-body collision reproduces native momentum, damping and early-return ordering", () => {
  expect(fixture.cases).toHaveLength(432);
  for (const v of fixture.cases) {
    const result = nativeBodyCollision(v.receiver, v.incoming, v.side);
    expect(result, JSON.stringify(v)).toEqual({
      receiver: { vx: v.receiver_out[0], vy: v.receiver_out[1] },
      incoming: { vx: v.incoming_out[0], vy: v.incoming_out[1] },
      result: v.result,
    });
  }
});

test("worm projectile contact uses native state-gated momentum response", () => {
  expect(fixture.worm_projectile_gates).toHaveLength(200);
  for (const v of fixture.worm_projectile_gates) {
    expect(
      nativeWormProjectileCollision(v.state, v.receiver, v.incoming, v.side),
      JSON.stringify(v),
    ).toEqual({
      receiver: { vx: v.receiver_out[0], vy: v.receiver_out[1] },
      incoming: { vx: v.incoming_out[0], vy: v.incoming_out[1] },
      result: v.result,
    });
  }
});

import {
  nativeComplexBounce,
  nativeSimpleBounce,
} from "../src/armageddon/motion.js";
test("complex terrain bounce matches native probes, overflow and stop ordering", () => {
  expect(fixture.complex_bounces).toHaveLength(1200);
  for (const v of fixture.complex_bounces) {
    const queries = [];
    const collide = (x, y) => {
      queries.push([x, y]);
      return v.pattern[queries.length - 1];
    };
    const result =
      v.entry === "004F4700"
        ? {
            body: nativeComplexBounce(v.body, v.side, collide),
            other: { vx: 0x3333, vy: 0 },
          }
        : nativeSimpleBounce(v.body, { vx: 0x3333, vy: 0 }, v.side, collide);
    expect({ ...result, queries }, JSON.stringify(v)).toEqual({
      body: {
        x: v.position_out[0],
        y: v.position_out[1],
        sleeping: v.sleeping_out,
        vx: v.body_out[0],
        vy: v.body_out[1],
      },
      other: { vx: v.other_out[0], vy: v.other_out[1] },
      queries: v.queries,
    });
  }
});
