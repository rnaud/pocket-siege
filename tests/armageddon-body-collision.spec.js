import { nativeContactReceiver } from "../src/armageddon/contact-receiver.js";
import { test, expect } from "./helpers/shared-page.js";
import fs from "node:fs";
import { nativeProjectileLaunch, attachNativeProjectile } from "../src/armageddon/projectile-runtime.js";
import {
  nativeBodyCollision,
  nativeWormProjectileCollision,
} from "../src/armageddon/body-collision.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/body-collision.json", import.meta.url),
  ),
);
test("two-body collision reproduces native momentum, damping and early-return ordering", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(432);
  for (const v of fixture.cases) {
    const result = nativeBodyCollision(v.receiver, v.incoming, v.side);
    const mine = nativeContactReceiver({ ...v.receiver, type: 10 }, v.incoming, v.side);
    expect([mine.receiver.vx, mine.receiver.vy]).toEqual(v.receiver_out);
    expect([mine.incoming.vx, mine.incoming.vy]).toEqual(v.incoming_out);
    expect(mine.result).toBe(v.result);
    // The projectile receiver 004E2200 forwards to the same 004F4990.
    expect(nativeContactReceiver({ ...v.receiver, type: 15 }, v.incoming, v.side)).toEqual({
      ...mine, receiver: { ...mine.receiver, type: 15 } });
    for (const type of [11, 12, 17]) {
      const receiver = { ...v.receiver, type };
      expect(nativeContactReceiver(receiver, v.incoming, v.side)).toEqual({
        receiver, incoming: v.incoming, calls: [], result: 0,
      });
    }

    expect(result, JSON.stringify(v)).toEqual({
      receiver: { vx: v.receiver_out[0], vy: v.receiver_out[1] },
      incoming: { vx: v.incoming_out[0], vy: v.incoming_out[1] },
      result: v.result,
    });
  }
});

test("worm projectile contact uses native state-gated momentum response", { tag: "@logic" }, () => {
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
test("complex terrain bounce matches native probes, overflow and stop ordering", { tag: "@logic" }, () => {
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

test("no live body's collision flags select the projectile category", { tag: "@logic" }, () => {
  // Projectiles register as type 15, so their receiver is only reached by a
  // body whose flags include bit 15: none of the default-scheme projectiles,
  // nor worms (0x420CC6) and the other live bodies, select it.
  const kinds = ["rocket", "grenade", "mortar", "dynamite", "cluster", "airstrike", "napalmstrike", "banana",
    "superbanana", "mingvase", "molesquadron", "sheep", "supersheep", "aquasheep", "sheeplauncher", "mbbomb",
    "molebomb", "sallyarmy", "skunk", "madcow", "oldwoman", "donkey", "postal", "carpetbomb", "sheepstrike",
    "minestrike", "napalm", "magic", "pigeon", "homing", "holy"];
  const flags = kinds.map((kind) => {
    const p = { kind, x: 100, y: 300, age: 0, fuse: 3, bounce: 0.55, ...nativeProjectileLaunch(kind, 0, 100) };
    attachNativeProjectile(p, 650);
    expect(p.nativeBody.type).toBe(15);
    return p.nativeBody.flags;
  });
  for (const value of [...flags, 0x420cc6, 0x40180e, 0x400002, 0x400000, 0x87]) expect(value & 0x8000).toBe(0);
});
