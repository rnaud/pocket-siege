import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/rope-tick.json" with { type: "json" };
import { nativeRopeBodyTick } from "../src/armageddon/rope-tick.js";

test(
  "constrained body ticks match native gravity, water, retries and damping",
  { tag: "@logic" },
  () => {
    for (const [index, row] of fixture.cases.entries()) {
      const calls = [];
      let terrainCalls = 0,
        bodyCalls = 0;
      const body = nativeRopeBodyTick(row.body, row.environment, {
        terrain: (x, y) => {
          calls.push(["terrain", x, y]);
          return Number(++terrainCalls === row.terrainAt);
        },
        collide: (x, y) => {
          calls.push(["collide", x, y]);
          return ++bodyCalls === row.bodyAt ? 7 : 0;
        },
        awake: () => {
          calls.push(["awake"]);
          return row.awake;
        },
        refresh: () => calls.push(["refresh"]),
        waterChanged: () => calls.push(["water"]),
        skim: (body) => {
          calls.push(["skim"]);
          if (row.releaseOnSkim) body.constrained = 0;
        },
        bounce: (_, hit) => calls.push(["bounce", hit]),
        freeBounce: (_, hit, side) => calls.push(["freeBounce", hit, side]),
        earthquake: (_, amount) => calls.push(["earthquake", amount]),
      });
      expect({ body, calls }, `native rope tick ${index}`).toEqual(row.output);
    }
  },
);

// Preserve callback-visible memory: event handlers can change constraints,
// velocities, segment lists and even scene earthquake state during a tick.
import swept from "./fixtures/armageddon/body-sweep-memory.json" with { type: "json" };
import forces from "./fixtures/armageddon/body-forces-memory.json" with { type: "json" };
import addressed from "./fixtures/armageddon/body-tick-memory.json" with { type: "json" };
import { nativeAdvancePhysicsListMemory } from "../src/armageddon/match-dispatch.js";
import { nativeBodyTickMemory } from "../src/armageddon/body-tick-memory.js";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
test(
  "addressed body stepping matches original memory at every mutable callback",
  { tag: "@logic" },
  () => {
    const body = 0x2000000,
      environment = body + 0x1000,
      world = body + 0x2000,
      segments = body + 0x5000;
    for (const [index, row] of [
      ...addressed.cases,
      ...forces.cases,
      ...swept.cases,
    ].entries()) {
      const bytes = inflateSync(Buffer.from(row.inputMemory, "base64"));
      const memory = {
        get: (at) => bytes.readUInt32LE(at - body),
        put: (at, value) => bytes.writeUInt32LE(value >>> 0, at - body),
      };
      const get = (offset) => memory.get(body + offset),
        put = (offset, value) => memory.put(body + offset, value);
      const hash = () => createHash("sha256").update(bytes).digest("hex");
      const calls = [];
      let steps = 0;
      const mode = row.mode;
      const call = (name, params = []) => calls.push([name, params, hash()]);
      const bounce = (name, params) => {
        call(name, params);
        if (mode === 11) {
          put(0x9c, 0);
          put(0xa0, 0);
        }
        if (mode === 12) {
          put(0x9c, 0x7fffffff);
          put(0xa0, 0x80000001);
        }
        if (mode === 13) {
          put(0xdc, 2);
          memory.put(segments + 12, 0x1234);
        }
      };
      const motion = (name, remaining) => {
        call(name, [remaining]);
        steps++;
        put(0x90, get(0x90) + 111);
        put(0x94, get(0x94) - 222);
        return {
          remaining: mode % 4 === 0 ? 0 : Math.floor(remaining / 2),
          hit: steps % 2 ? 7 : 0,
          side: 3,
        };
      };
      const host = {
        awake: () => {
          call("awake");
          if (mode === 15) memory.put(world + 0x1ac4, 23);
          return Number(![3, 4, 5].includes(mode));
        },
        refresh: () => {
          call("refresh");
          if (mode === 6) {
            put(0xbc, 1);
            put(0xc8, 1 - get(0xc8));
          }
        },
        water: (_env, _body, old) => {
          call("water", [old]);
          put(0xbc, Number(mode % 3 === 0));
          if (mode === 7) put(0xc8, 0);
          if (mode === 8) memory.put(environment + 0x3b8, 0x8000);
          return Number(mode === 9);
        },
        air: () => {
          call("air");
          put(0x9c, get(0x9c) + 123);
          put(0xc4, 1);
        },
        waterChanged: () => {
          call("waterChanged");
          if (mode === 10) put(0xc8, 1 - get(0xc8));
        },
        rope: (_env, _body, remaining) => motion("rope", remaining),
        sweep: (_env, _body, remaining) => motion("sweep", remaining),
        bounce: (_body, hit) => bounce("bounce", [hit]),
        freeBounce: (_body, hit, side) => bounce("freeBounce", [hit, side]),
        collide: (_env, _body, x, y) => {
          call("collide", [x, y]);
          if (row.nativeForces && mode === 7) {
            memory.put(environment + 0x3b4, 170);
            put(0x9c, 800000);
            put(0xa0, 1234);
          }
          if (row.nativeForces && mode === 8) {
            put(0x64, 0x8000);
            put(0x9c, 123456);
          }
          return row.nativeForces && mode % 2 ? 0 : 1;
        },
        skim: () => {
          call("skim");
          put(0xc8, 0);
          if (mode === 9) {
            put(0xa0, 0);
            put(0x9c, 0);
          }
        },
        earthquake: (_env, _body, amount) => {
          call("earthquake", [amount]);
          put(0x9c, 456);
          memory.put(world + 0x1ac4, 0);
        },
      };
      if (row.nativeForces) {
        delete host.water;
        delete host.air;
      }
      if (row.nativeSweep) delete host.sweep;
      if (row.throughList)
        nativeAdvancePhysicsListMemory(
          memory,
          environment,
          (env, actor, slot) =>
            nativeBodyTickMemory(memory, env, actor, slot, host),
        );
      else nativeBodyTickMemory(memory, environment, body, 1, host);
      expect(
        { calls, sha256: hash() },
        `native addressed body ${index}`,
      ).toEqual({ calls: row.calls, sha256: row.sha256 });
    }
  },
);
