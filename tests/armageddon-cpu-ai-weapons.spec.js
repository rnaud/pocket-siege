import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/cpu-ai-weapons.json" with { type: "json" };
import { aiBlastEstimate } from "../src/armageddon/cpu-ai.js";
import {
  aiWaterEscape, aiChooseEscape, aiGunShot, aiGunEvaluate, aiGunAfterShot, aiMeleeShot, aiMeleeEvaluate, aiMeleeState,
  aiDropShot, aiDropEvaluate, aiDropState, aiStrikeShot, aiStrikeEvaluate, aiStrikeState, aiTeleportSearch,
  aiTeleportStart, aiTeleportState, aiGoThen, aiStartPlan, aiSearchOrder, nextLogicRandom,
} from "../src/armageddon/cpu-ai-weapons.js";

const { cases } = fixture;
const WEAPONS = 0x3000000 + 0x125bc;
const recordAddress = (weapon) => WEAPONS + weapon * 0x208;
const FNV = (h, v) => {
  for (let i = 0; i < 4; i++) h = Math.imul(h ^ ((v >>> (8 * i)) & 0xff), 0x01000193) >>> 0;
  return h;
};
const inside = (rects, x, y) => rects.some(([l, t, r, b]) => l <= x && x <= r && t <= y && y <= b);

function world(c) {
  const team = (t) => c.teams?.[t] ?? {};
  return {
    damageScale: c.scene?.[0x814] ?? 0, water: c.scene?.[0x804] ?? 0, rangeWord: c.rangeWord ?? 0,
    health: (t, w) => team(t).health?.[w] ?? 0,
    altHealth: (t, w) => team(t).alt?.[w] ?? 0,
    teamFlag: (t) => team(t).flag ?? 0,
    alliance: (t) => team(t).alliance ?? (c.teams ? t : 0),
    ally: (t) => (team(t).byte3cd4 ?? 0) & 0xff,
    double: (t) => ((team(t).byte4888 ?? 0) << 24 >> 24) >= 0,
  };
}
// Harness mirroring the oracle's fakes; counts and hashes every landscape probe.
function harness(c, extra = {}) {
  const tasks = (c.worms ?? []).map((w) => ({
    type: w.type ?? 2, x: w.x, y: w.y, team: w.team ?? 0, worm: w.worm ?? 0, snapshot: (w.msgResult ?? 1) !== 0,
    msg5: w.msg5 ?? 0, msg6: w.msg6 ?? 0, self: !!w.own,
  }));
  const self = tasks.find((t) => t.self);
  const w = world(c), calls = [], terrain = c.terrain ?? [];
  const stats = { probes: 0, probeHash: 0x811c9dc5, blocks: 0, blockHash: 0x811c9dc5, collides: 0, collideHash: 0x811c9dc5 };
  let flags = c.ownFlags ?? (c.worms?.[0]?.flags ?? 0);
  const ai = { ...c.ai, seed: (c.ai?.seed ?? 0) | 0 };
  const host = {
    tasks: () => tasks, world: w, water: c.scene?.[0x804] ?? 0, positions: c.positions ?? [],
    ownPosition: () => [self.x, self.y],
    teleport: (x, y) => {
      const ok = (c.blocked ?? []).some(([bx, by]) => bx === x >> 16 && by === y >> 16) ? 0 : 1;
      if (ok) { self.x = x; self.y = y; }
      calls.push({ operation: "teleport", request: [x, y], result: ok });
      return ok;
    },
    wormFlags: () => { calls.push({ operation: "flags", request: [], result: flags }); return flags; },
    setWormFlags: (v) => { calls.push({ operation: "setFlags", request: [v | 0] }); flags = v | 0; },
    yield: () => calls.push({ operation: "yield", request: [] }),
    solid: (x, y) => { stats.probes++; stats.probeHash = FNV(FNV(stats.probeHash, x), y); return inside(terrain, x, y); },
    blocked: (x, y) => { stats.blocks++; stats.blockHash = FNV(FNV(stats.blockHash, x), y); return inside(terrain, x, y); },
    collides: (mask, x, y, f) => {
      stats.collides++; stats.collideHash = FNV(FNV(FNV(FNV(stats.collideHash, mask), x), y), f);
      return inside(terrain, x >> 16, y >> 16);
    },
    wind: () => c.wind ?? 0, gravity: () => c.gravity ?? 0, ammo: () => c.ammo ?? 0,
    estimate: (x, y, r, d, exclude) => aiBlastEstimate({ ...ai, x: self.x, y: self.y },
      tasks.filter((t) => t.type === 2 && t.snapshot), w, x, y, r, d, exclude),
    pathfind: (x, y) => {
      const rows = (c.pathEscapes ?? c.escapes ?? []).slice(0, 0x80);
      calls.push({ operation: "path", request: [x, y], result: rows.length });
      return rows;
    },
    routeByte: (path) => c.routeBytes?.[path] ?? c.routeByte ?? 0,
    ...extra,
  };
  return { ai, host, calls, stats, self };
}
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));
const STAT_KEYS = ["probes", "probeHash", "blocks", "blockHash", "collides", "collideHash"];
// Words a family's plan builder writes; the rest of the original record is stack garbage.
const WRITTEN = {
  gun: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  melee: [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 14, 15],
  drop: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  strike: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
};
const words = (plan, keys) => keys.map((k) => plan[k]);
const fromShot = (shot, fill) => { const p = new Array(24).fill(fill); if (shot) for (const [k, v] of Object.entries(shot)) p[k] = v; return p; };

test("004CEFD0 crawl-to-water escape measure", { tag: "@logic" }, () => {
  const seen = new Set();
  for (const [index, c] of cases.waterEscape.entries()) {
    const { host, stats } = harness({ ...c, scene: { 0x804: c.water } });
    expect(aiWaterEscape(host, ...c.args), `case${index}`).toBe(c.result);
    expect(pick(stats, STAT_KEYS), `case${index}`).toEqual(pick(c, STAT_KEYS));
    seen.add(c.result === 0x13333 ? "water" : c.result === 0x3333 ? "far" : c.result ? "falls" : "wall");
  }
  expect([...seen].sort()).toEqual(["falls", "far", "wall", "water"]);
});

test("004CE920/004CEA30 escape position choice", { tag: "@logic" }, () => {
  for (const [index, c] of cases.escape.entries()) {
    const { ai, host, stats } = harness(c);
    const [x, y, mode] = c.args;
    expect(aiChooseEscape(ai, host, c.escapes, x, y, mode), `case${index}`).toBe(c.result);
    expect(pick(stats, STAT_KEYS), `case${index}`).toEqual(pick(c, STAT_KEYS));
  }
});

test("004F29D0 gun ray shot", { tag: "@logic" }, () => {
  let solved = 0;
  for (const [index, c] of cases.gunShot.entries()) {
    const { host, stats } = harness(c);
    const [x0, y0, tx, ty, radius, damage] = c.args;
    const shot = aiGunShot({ weapon: c.weapon, record: recordAddress(c.weapon), range: c.range, x0, y0, tx, ty, radius, damage }, host);
    expect(shot ? 1 : 0, `case${index}`).toBe(c.result);
    expect(fromShot(shot, 0x1234567), `case${index}`).toEqual(c.plan.map((v, k) => (shot && !WRITTEN.gun.includes(k) ? 0x1234567 : v)));
    expect(pick(stats, STAT_KEYS), `case${index}`).toEqual(pick(c, STAT_KEYS));
    solved += c.result;
  }
  expect(solved).toBeGreaterThan(20);
});

function searchCase(c, evaluate) {
  const { ai, host, calls, stats } = harness(c);
  const plan = new Array(24).fill(0x2468ace);
  const result = evaluate(ai, plan, host);
  return { ai, plan, result, calls, stats };
}
function expectSearch(c, out, family, index) {
  const label = `case${index}`;
  expect(out.result, label).toBe(c.result);
  expect(out.calls, label).toEqual(c.calls);
  expect(pick(out.stats, STAT_KEYS), label).toEqual(pick(c, STAT_KEYS));
  expect(out.ai.seed >>> 0, label).toBe(c.seed);
  if (out.result) expect(words(out.plan, WRITTEN[family]), label).toEqual(words(c.plan, WRITTEN[family]));
  else expect(out.plan[6], label).toBe(c.plan[6]);
}

test("004F2D50 gun evaluator over reachable positions", { tag: "@logic" }, () => {
  let found = 0;
  for (const [index, c] of cases.gunSearch.entries()) {
    const out = searchCase(c, (ai, plan, host) =>
      aiGunEvaluate(ai, plan, c.weapon, { ...c.record, address: recordAddress(c.weapon) }, host));
    expectSearch(c, out, "gun", index);
    found += out.result;
  }
  expect(found).toBeGreaterThan(5);
});

test("004F23D0/004CF4B0 punch box estimate", { tag: "@logic" }, () => {
  let hits = 0;
  for (const [index, c] of cases.meleeShot.entries()) {
    const { ai, host, stats } = harness(c);
    const [px, py, x1, y1, x2, y2, damage, facing] = c.args;
    const shot = aiMeleeShot(ai, { weapon: 0x10, record: recordAddress(0x10), px, py, x1, y1, x2, y2, damage, facing }, host);
    expect(shot[3], `case${index}`).toBe(c.result);
    expect(words(fromShot(shot, 0), WRITTEN.melee), `case${index}`).toEqual(words(c.plan, WRITTEN.melee));
    expect(pick(stats, STAT_KEYS), `case${index}`).toEqual(pick(c, STAT_KEYS));
    hits += shot[3] || shot[4] ? 1 : 0;
  }
  expect(hits).toBeGreaterThan(5);
});

test("004F2470 fire punch evaluator", { tag: "@logic" }, () => {
  let found = 0;
  for (const [index, c] of cases.meleeSearch.entries()) {
    const out = searchCase(c, (ai, plan, host) =>
      aiMeleeEvaluate(ai, plan, c.weapon, { ...c.record, address: recordAddress(c.weapon) }, host));
    expectSearch(c, out, "melee", index);
    found += out.result;
  }
  expect(found).toBeGreaterThan(2);
});

test("004F1BF0 drop placement plan", { tag: "@logic" }, () => {
  let solved = 0;
  for (const [index, c] of cases.dropShot.entries()) {
    const { host } = harness(c);
    const [px, py, tx, ty, radius, damage] = c.args;
    const shot = aiDropShot({ weapon: c.weapon, record: recordAddress(c.weapon), px, py, tx, ty, radius, damage }, host);
    expect(shot ? 1 : 0, `case${index}`).toBe(c.result);
    if (shot) expect(words(fromShot(shot, 0), WRITTEN.drop), `case${index}`).toEqual(words(c.plan, WRITTEN.drop));
    else expect(c.plan.every((v) => v === 0x1234567), `case${index}`).toBe(true);
    solved += c.result;
  }
  expect(solved).toBeGreaterThan(10);
});

test("004F1FC0/004F1D50 drop evaluator with escape choice", { tag: "@logic" }, () => {
  let found = 0;
  for (const [index, c] of cases.dropSearch.entries()) {
    let escapes = [];
    const out = searchCase(c, (ai, plan, host) => {
      const r = aiDropEvaluate(ai, plan, c.weapon, { ...c.record, address: recordAddress(c.weapon) }, host);
      escapes = ai.escapes ?? [];
      return r;
    });
    expectSearch(c, out, "drop", index);
    expect(escapes, `case${index}`).toEqual(c.escapeTable);
    found += out.result;
  }
  expect(found).toBeGreaterThan(3);
});

const strikeRecord = (r, weapon) => ({ ...r, address: recordAddress(weapon),
  bomb: { blast: r.blast, mode: r.mode, extra: r.extra, extraCount: r.extraCount } });
test("004F1400 strike release point and drop line", { tag: "@logic" }, () => {
  let solved = 0;
  for (const [index, c] of cases.strikeShot.entries()) {
    const { host, stats } = harness(c);
    const [px, py, tx, ty, ax, radius, damage, dir] = c.args;
    const shot = aiStrikeShot({ weapon: c.weapon, record: recordAddress(c.weapon), px, py, tx, ty, ax, radius, damage, dir },
      strikeRecord(c.record, c.weapon), host);
    expect(shot ? 1 : 0, `case${index}`).toBe(c.result);
    if (shot) expect(words(fromShot(shot, 0), WRITTEN.strike), `case${index}`).toEqual(words(c.plan, WRITTEN.strike));
    expect(pick(stats, STAT_KEYS), `case${index}`).toEqual(pick(c, STAT_KEYS));
    solved += c.result;
  }
  expect(solved).toBeGreaterThan(10);
});

test("004F1A50/004F1730 strike evaluator in both directions", { tag: "@logic" }, () => {
  let found = 0;
  for (const [index, c] of cases.strikeSearch.entries()) {
    const out = searchCase(c, (ai, plan, host) => aiStrikeEvaluate(ai, plan, c.weapon, strikeRecord(c.record, c.weapon), host));
    expectSearch(c, out, "strike", index);
    found += out.result;
  }
  expect(found).toBeGreaterThan(3);
});

test("004F10A0/004F0F60 teleport destination search", { tag: "@logic" }, () => {
  let found = 0;
  for (const [index, c] of cases.teleportSearch.entries()) {
    const { ai, host, calls, stats } = harness(c);
    const r = aiTeleportSearch(ai, host, c.held);
    expect(r ? 1 : 0, `case${index}`).toBe(c.result);
    if (r) expect(r, `case${index}`).toEqual(c.out);
    expect(calls, `case${index}`).toEqual(c.calls);
    expect(pick(stats, STAT_KEYS), `case${index}`).toEqual(pick(c, STAT_KEYS));
    expect(ai.seed >>> 0, `case${index}`).toBe(c.seed);
    found += c.result;
  }
  expect(found).toBeGreaterThan(3);
});

const STATE_KEYS = ["state", "nextState", "action", "delay", "replanned", "seed", "x", "y", "targetMode", "fuse", "field2930"];
const walkView = (ai, out) => (ai.walk
  ? { walkX: ((ai.walk.x & 0xffff) | (ai.walk.y << 16)) | 0, walkY: ai.walk.path, walkY2: ai.walk.path, walkPX: ai.walk.x,
    walkPY: ai.walk.y, walkF: 0, walkG: 0 }
  : pick(out, ["walkX", "walkY", "walkY2", "walkPX", "walkPY", "walkF", "walkG"]));
test("execution states 0x6E..0x7A", { tag: "@logic" }, () => {
  const seen = new Set();
  for (const [index, c] of cases.states.entries()) {
    const label = `case${index} state${c.state.toString(16)}`;
    const { ai, host, calls, stats } = harness(c);
    Object.assign(ai, { weapon: c.plan[1], walk: null, field2930: 0, nextState: c.ai.nextState });
    ai.escapes = c.escapes;
    const plan = [...c.plan];
    const view = { wormState: c.wormState, selected: c.selected, canAttack: c.ai.canAttack };
    if (c.state === 0x6e) aiGunAfterShot(ai, plan, view, host);
    else if (c.state <= 0x71) aiDropState(ai, plan, view, host);
    else if (c.state <= 0x74) aiStrikeState(ai, plan, view, host);
    else if (c.state <= 0x77) aiTeleportState(ai, view);
    else aiMeleeState(ai, plan, view, host);
    const out = { ...pick(c.out, STATE_KEYS), seed: c.out.seed | 0 };
    expect({ ...pick(ai, STATE_KEYS), seed: ai.seed | 0, field2930: ai.field2930 ?? 0 }, label).toEqual(out);
    expect(walkView(ai, c.out), label).toEqual(pick(c.out, ["walkX", "walkY", "walkY2", "walkPX", "walkPY", "walkF", "walkG"]));
    expect(plan.slice(12, 18), label).toEqual(c.outPlan.slice(12, 18));
    expect(calls, label).toEqual(c.calls);
    expect(pick(stats, STAT_KEYS), label).toEqual(pick(c, STAT_KEYS));
    if (calls.some((call) => call.operation === "path")) expect((ai.escapes ?? []).length, label).toBe(c.out.escapeCount);
    seen.add(`${c.state}:${ai.action}:${ai.state}`);
  }
  expect(seen.size).toBeGreaterThan(25);
});

test("004F0E40 teleport setup, 004D0170 walk-then-state and 004CDC10 plan start", { tag: "@logic" }, () => {
  for (const [index, c] of cases.misc.entries()) {
    const label = `case${index} ${c.kind}`;
    const ai = { field2930: 0, walk: null, nextState: 0, targetMode: 0, x: 0, y: 0, weapon: 0, action: 0, ...c.ai };
    const host = { routeByte: (path) => (c.kind === "walk" ? c.routeByte : c.routeBytes[path] ?? 0), positions: c.positions };
    if (c.kind === "teleportSetup") {
      aiTeleportStart(ai, ...c.args);
      expect(pick(ai, ["weapon", "targetMode", "x", "y", ...STATE_KEYS.slice(0, 5)]), label)
        .toEqual(pick(c.out, ["weapon", "targetMode", "x", "y", ...STATE_KEYS.slice(0, 5)]));
      continue;
    }
    if (c.kind === "walk") expect(aiGoThen(ai, c.state, c.entry, host), label).toBe(c.result);
    else aiStartPlan(ai, c.plan, host);
    expect(pick(ai, ["state", "nextState", "delay", "replanned", "field2930"]), label)
      .toEqual(pick(c.out, ["state", "nextState", "delay", "replanned", "field2930"]));
    expect(walkView(ai, c.out), label).toEqual(pick(c.out, ["walkX", "walkY", "walkY2", "walkPX", "walkPY", "walkF", "walkG"]));
  }
});

test("004CE3A0 weapon-group search order", { tag: "@logic" }, () => {
  const paths = new Set();
  for (const [index, c] of cases.order.entries()) {
    const label = `case${index}`;
    const { ai, host, calls, stats } = harness({ ...c, worms: [{ team: c.ai.team, worm: 1, x: c.x0, y: c.y0, own: true }] });
    ai.stamp = c.ai.teamStamp;
    let logicSeed = c.scene[0x1acc] | 0, list = [0, 0];
    const own = 1;
    const plan = new Array(24).fill(0);
    const evaluate = (family, weapon, p) => {
      const row = c.evaluators[weapon];
      if (row.result) { for (let k = 1; k < 24; k++) if (k !== 5) p[k] = row.plan[k]; p[1] = weapon; }
      else p[6] = 0;
      calls.push({ operation: "evaluate", request: [family, weapon], result: row.result });
      return row.result;
    };
    Object.assign(host, {
      canAttack: c.ai.canAttack, forced: c.ai.forced, selected: c.ai.selected, wormWeapon: c.ai.wormWeapon,
      airStrikeAllowed: c.ai.airStrike, ammo: (w) => c.ammo[w], weight: (w) => c.weights[w], evaluate,
      register: (f, phase) => calls.push({ operation: "toggle", request: [1, 0, 0, own, f, phase] }),
      logicRandom: () => (logicSeed = nextLogicRandom(logicSeed, c.scene[0x7f0])),
    });
    aiSearchOrder(ai, plan, host);
    if (host.list) list = host.list;
    expect(calls, label).toEqual(c.calls);
    // Words 0 and 5 of a replaced plan are stamped by 004CE270/004CE3A0; all others come from the evaluators.
    expect(plan, label).toEqual(c.plan);
    expect(ai.seed >>> 0, label).toBe(c.seed);
    expect(logicSeed >>> 0, label).toBe(c.logicSeed);
    expect(list, label).toEqual(c.globalList);
    expect(pick(stats, STAT_KEYS), label).toEqual(pick(c, STAT_KEYS));
    if (c.ai.canAttack) expect(c.dc8, label).toBe(0);
    paths.add(!c.ai.canAttack ? "idle" : c.ai.forced ? "forced" : c.ai.wormWeapon ? "held" : "groups");
  }
  expect([...paths].sort()).toEqual(["forced", "groups", "held", "idle"]);
});
