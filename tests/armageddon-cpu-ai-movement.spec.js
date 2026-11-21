import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/cpu-ai-movement.json" with { type: "json" };
import {
  aiReachableSpots, aiBuildReachable, aiDecodePath, aiPathStart, aiPathStep, aiRingSolid, aiStepAlong,
  aiDrownExposure, aiSpotScore, aiChooseSpot, aiImminentExplosion, aiHazardFlee, aiRetreatStep, createAiPathfinder,
} from "../src/armageddon/cpu-ai-movement.js";

const { cases } = fixture;
const fnv = (h, v) => {
  for (let i = 0; i < 4; i++) h = Math.imul(h ^ ((v >>> (8 * i)) & 0xff), 0x01000193) >>> 0;
  return h;
};
// The oracle's landscape: ground below heights[x], solid rectangles, walls outside.
function terrain({ heights, rects }) {
  const w = heights.length;
  const pixel = (x, y) => (x < 0 || x >= w || y >= heights[x] || rects.some((r) => r[0] <= x && x <= r[2] && r[1] <= y && y <= r[3]) ? 1 : 0);
  const box = (x, y) => {
    const cx = x >> 16, cy = y >> 16, x0 = cx - 4, x1 = cx + 4, y0 = cy - 6, y1 = cy + 6;
    if (x0 < 0 || x1 >= w) return 1;
    for (let i = x0; i <= x1; i++) if (heights[i] <= y1) return 1;
    return rects.some((r) => r[0] <= x1 && x0 <= r[2] && r[1] <= y1 && y0 <= r[3]) ? 1 : 0;
  };
  return { pixel, box };
}
function counted(t) {
  const probe = { probes: 0, probeHash: 0x811c9dc5, pixels: 0, pixelHash: 0x811c9dc5 };
  probe.collide = (x, y) => { probe.probes++; probe.probeHash = fnv(fnv(probe.probeHash, x), y); return t.box(x, y); };
  probe.pixel = (x, y) => { probe.pixels++; probe.pixelHash = fnv(fnv(probe.pixelHash, x), y); return t.pixel(x, y); };
  return probe;
}
const bytes = (hex) => Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16));
const toHex = (array) => Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("").replace(/(00)+$/, "");
const fillHost = (c, probe, worm) => {
  const state = { yields: 0, flags: worm.flags ?? 0 };
  return Object.assign(state, {
    collide: probe.collide, gravity: () => c.gravity, water: c.water ?? c.scene[0x804],
    flames: c.flames.map((f) => [f.x, f.y]), mines: c.mines.map((m) => ({ x: m.x, y: m.y, inactive: m.m7d5 })),
    moving: () => (worm.moving ? 1 : 0) || (c.moveAfter != null && state.yields >= c.moveAfter) ? 1 : 0,
    state: () => worm.state ?? 0x65, yield: () => { state.yields++; },
    wormFlags: () => state.flags, setWormFlags: (v) => { state.flags = v; },
  });
};
function registry(c) {
  const entries = [{ self: true }];
  for (const t of c.tasks) entries.splice(t.slot, 0, { type: t.type, x: t.x, y: t.y, team: t.team, worm: t.worm,
    inactive: t.m7d5, armed: t.m7d6 });
  return entries;
}
const world = (c, probe) => ({ pixel: probe.pixel, water: c.water, health: (t, w) => c.teams[t]?.[w] ?? 0 });

test("004C8920 reachable positions via 004CE690/004CE730", { tag: "@logic" }, () => {
  expect(cases.flood.length).toBeGreaterThan(40);
  for (const [index, c] of cases.flood.entries()) {
    const probe = counted(terrain(c.terrain));
    const host = fillHost(c, probe, c.worm);
    const original = bytes(c.buffer);
    const buffer = new Uint8Array(0x2000);
    if (c.second) buffer.set(original.subarray(0, c.prior));

    const ai = { buffer, used: c.prior, skipFill: c.flag, pathfinder: createAiPathfinder() };
    const result = aiBuildReachable(ai, c.args[0], c.args[1], c.second ? 2 : 1, host);
    const label = `case${index}`;
    expect(result, label).toBe(c.result);
    expect(c.second ? ai.count2 : ai.count1, label).toBe(c.count);
    expect(c.count > 0 ? (c.second ? ai.spots2 : ai.spots1) : [], label).toEqual(c.spots);
    expect(ai.used, label).toBe(c.used);
    expect(toHex(buffer), label).toBe(c.buffer);
    expect([host.yields, probe.probes, probe.probeHash, host.flags], label).toEqual([c.yields, c.probes, c.probeHash, c.wormFlags]);
  }
});

test("004C8920 path records decode to walk/jump/drop steps", { tag: "@logic" }, () => {
  let jumps = 0, drops = 0;
  for (const c of cases.flood) {
    if (!c.count) continue;
    const buffer = new Uint8Array(0x2000);
    buffer.set(bytes(c.buffer));
    for (const [x, y, path] of c.spots) {
      const steps = aiDecodePath(buffer, path);
      expect(steps.at(-1)).toEqual([x, y, 0]);
      // The first step starts at the worm, or one walk step away for jumps tried at the root.
      if (steps.length > 1) {
        expect(Math.abs(steps[0][0] - (c.args[0] >> 16))).toBeLessThanOrEqual(1);
        expect(Math.abs(steps[0][1] - (c.args[1] >> 16))).toBeLessThanOrEqual(8);
      }
      for (const [, , action] of steps.slice(0, -1)) {
        expect([1, -1, 2, -2, 3, -3, 4]).toContain(action);
        if (Math.abs(action) > 1 && action !== 4) jumps++;
        if (action === 4) drops++;
      }
    }
  }
  // The 256-entry move stack bounds each walk to about 256 pixels, so fills stay well under 128 spots.
  expect(Math.max(...cases.flood.map((c) => c.count))).toBeGreaterThan(30);
  expect(jumps).toBeGreaterThan(0);
  expect(drops).toBeGreaterThan(0);
});

const AI_KEYS = ["state", "nextState", "action", "jumpIssued", "cursor", "step", "fromX", "fromY", "toX", "toY", "stall",
  "failures", "delay", "replanned"];
const pick = (ai) => Object.fromEntries(AI_KEYS.map((k) => [k, ai[k] | 0]));

test("004D0170/004D0130 path following (004CFF20/004CFD20)", { tag: "@logic" }, () => {
  for (const [index, c] of cases.walk.entries()) {
    const source = cases.flood[c.source];
    const t = terrain(source.terrain);
    const ai = { buffer: new Uint8Array(0x2000), failures: c.failures };
    ai.buffer.set(bytes(source.buffer));
    for (const k of AI_KEYS) ai[k] ??= 0;
    expect(aiPathStart(ai, c.spot, c.nextState), `case${index}`).toBe(c.started);
    expect(pick(ai), `case${index} start`).toEqual(pick(c.afterStart));
    for (const [n, s] of c.steps.entries()) {
      const worm = { x: s.x, y: s.y };
      ai.action = 0;
      aiPathStep(ai, {
        wormState: () => s.state, position: () => [worm.x, worm.y],
        teleport: (x, y) => (t.box(x, y) ? 0 : ((worm.x = x), (worm.y = y), 1)),
      });
      const label = `case${index} step${n}`;
      expect(pick(ai), label).toEqual(pick(s.ai));
      expect([worm.x, worm.y], label).toEqual([s.wormX, s.wormY]);
    }
  }
});

test("004CED90/004CEEC0/004CEFD0 landscape ring, step and drowning exposure", { tag: "@logic" }, () => {
  for (const [index, c] of cases.land.entries()) {
    const probe = counted(terrain(c.terrain));
    let result, out = null;
    if (c.kind === "ring") result = aiRingSolid(probe.pixel, ...c.args);
    else if (c.kind === "step") {
      const step = aiStepAlong(probe.pixel, c.water, ...c.args);
      result = step.result; out = [step.x, step.result < 0 ? c.args[1] : step.y];
    } else result = aiDrownExposure(probe.pixel, c.water, ...c.args);
    const label = `case${index} ${c.kind}`;
    expect(result, label).toBe(c.result);
    if (c.kind === "step") expect(out, label).toEqual(c.out);
    expect([probe.pixels, probe.pixelHash], label).toEqual([c.pixels, c.pixelHash]);
  }
});

test("004CEA30 spot safety score", { tag: "@logic" }, () => {
  for (const [index, c] of cases.score.entries()) {
    const probe = counted(terrain(c.terrain));
    const [, ownY, x, y] = c.args;
    expect(aiSpotScore({ team: c.team }, ownY, x, y, registry(c), world(c, probe)), `case${index}`).toBe(c.result);
    expect([probe.pixels, probe.pixelHash], `case${index}`).toEqual([c.pixels, c.pixelHash]);
  }
});

test("004CE920 spot chooser and 004CEC90 imminent explosion", { tag: "@logic" }, () => {
  for (const [index, c] of cases.choose.entries()) {
    const probe = counted(terrain(c.terrain));
    expect(aiChooseSpot({ team: c.team }, c.records, c.impact[0], c.impact[1], c.flags, [c.worm.x, c.worm.y],
      registry(c), world(c, probe)), `case${index}`).toBe(c.result);
  }
  for (const [index, c] of cases.imminent.entries())
    expect(aiImminentExplosion(registry(c), world(c, counted(terrain(c.terrain)))), `case${index}`).toBe(c.result);
});

function stateHost(c, ai) {
  const t = terrain(c.terrain), probe = counted(t);
  const worm = { ...c.worm };
  const host = fillHost({ ...c, water: c.water }, probe, worm);
  Object.assign(host, { wormState: () => worm.state ?? 0x65, position: () => [worm.x, worm.y], tasks: registry(c),
    world: world(c, probe) });
  ai.pathfinder = createAiPathfinder();
  return { host, probe };
}
test("004F3E50 retreat from the planned impact (state 0x6A)", { tag: "@logic" }, () => {
  for (const [index, c] of cases.retreat.entries()) {
    const ai = { team: c.ai.team, state: 0x6a, impactX: c.ai.impactX, impactY: c.ai.impactY, used: c.ai.used,
      buffer: new Uint8Array(0x2000), skipFill: 0 };
    for (const k of AI_KEYS) ai[k] ??= 0;
    const { host, probe } = stateHost(c, ai);
    aiRetreatStep(ai, host);
    const label = `case${index}`;
    expect(pick(ai), label).toEqual(pick(c.out));
    expect(ai.count2 ?? 0, label).toBe(c.out.count2);
    if (c.out.count2 > 0) expect(ai.spots2, label).toEqual(c.spots);
    expect(toHex(ai.buffer), label).toBe(c.buffer);
    if (c.out.state === 0x66) expect([ai.target[0], ai.target[1]], label).toEqual([c.out.target0 << 16 >> 16, c.out.target0 >> 16]);
    expect([host.yields, probe.pixels], label).toEqual([c.yields, c.pixels]);
  }
});

test("004CD460 hazard flee prologue", { tag: "@logic" }, () => {
  for (const [index, c] of (cases.flee ?? []).entries()) {
    const ai = { team: c.ai.team, state: c.ai.state, used: 0, buffer: new Uint8Array(0x2000), skipFill: 0 };
    for (const k of AI_KEYS) ai[k] ??= 0;
    const { host } = stateHost(c, ai);
    const handled = aiHazardFlee(ai, host);
    const label = `case${index}`;
    expect(handled, label).toBe(c.handled);
    if (handled) expect(pick(ai), label).toEqual(pick(c.out));
  }
});
