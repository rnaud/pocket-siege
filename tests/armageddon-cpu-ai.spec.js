import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/cpu-ai.json" with { type: "json" };
import {
  createAiPicker, aiPickerAdd, aiPickerPick, aiPickerRemove, aiComparePlans, aiEvaluateWeapon, aiWeaponTrial,
  aiBallisticShot, aiBlastEstimate, aiBallisticEvaluate, aiBallisticFireSetup, aiAimStep, aiChargeStep, aiGunSetup, aiActionEvents,
} from "../src/armageddon/cpu-ai.js";

const { cases } = fixture;
const WEAPONS = 0x3000000 + 0x125bc;

function world(c) {
  const team = (t) => c.teams[t] ?? {};
  return {
    damageScale: c.scene[0x814], water: c.scene[0x804], rangeWord: c.rangeWord,
    health: (t, w) => team(t).health?.[w] ?? 0,
    altHealth: (t, w) => team(t).alt?.[w] ?? 0,
    teamFlag: (t) => team(t).flag ?? 0,
    alliance: (t) => team(t).alliance ?? t,
    ally: (t) => (team(t).byte3cd4 ?? 0) & 0xff,
    double: (t) => ((team(t).byte4888 ?? 0) << 24 >> 24) >= 0,
  };
}
function blastSetup(c) {
  const own = c.worms.find((w) => w.own);
  const ai = { ...c.ai, x: own.x, y: own.y };
  const worms = c.worms.filter((w) => (w.type ?? 2) === 2 && (w.msgResult ?? 1) !== 0)
    .map((w) => ({ team: w.team, worm: w.worm, x: w.x, y: w.y, self: !!w.own }));
  return { ai, worms, world: world(c) };
}

test("004CBC50/004CBCD0/004CBDB0 weighted weapon picker", { tag: "@logic" }, () => {
  for (const [index, ops] of cases.picker.entries()) {
    const picker = createAiPicker();
    for (const op of ops) {
      let result, out;
      if (op.op === "add") result = aiPickerAdd(picker, ...op.args);
      else if (op.op === "pick") { out = aiPickerPick(picker, op.args[0]); result = out === null ? 0 : 1; }
      else if (op.op === "remove") result = aiPickerRemove(picker, op.args[0]);
      else { picker.entries.length = 0; result = 0; }
      expect(result, `seq${index} ${op.op}`).toBe(op.result);
      if (op.op === "pick" && result) expect(out).toBe(op.out);
      expect(picker.entries).toEqual(op.entries);
    }
  }
});

test("004CFA90 plan ranking with family scores", { tag: "@logic" }, () => {
  for (const [index, c] of cases.compare.entries())
    expect(aiComparePlans(c.best, c.candidate, c.skill), `case${index}`).toBe(c.result);
});

const evaluator = (rows) => (family, weapon, plan) => {
  const row = rows.find((r) => r.weapon === weapon);
  if (row.result) { for (let k = 1; k < 24; k++) if (k !== 5) plan[k] = row.plan[k]; plan[1] = weapon; }
  else plan[6] = 0;
  return row.result;
};

test("004CE7D0 evaluation dispatch and difficulty filter", { tag: "@logic" }, () => {
  for (const [index, c] of cases.filter.entries()) {
    const plan = new Array(24).fill(0x7777), calls = [];
    const evaluate = evaluator([c.evaluator]);
    const result = aiEvaluateWeapon(c.ai, plan, c.weapon, (family, weapon, p) => {
      const r = evaluate(family, weapon, p);
      calls.push({ operation: "evaluate", request: [family, weapon], result: r });
      return r;
    });
    expect(result, `case${index}`).toBe(c.result);
    expect(plan, `case${index}`).toEqual(c.plan);
    expect(calls).toEqual(c.calls);
  }
});

test("004CE270 weapon-group trial", { tag: "@logic" }, () => {
  for (const [index, c] of cases.trial.entries()) {
    const ai = { ...c.ai, stamp: c.stamp }, calls = [];
    const evaluate = evaluator(c.evaluators);
    const best = [...c.best];
    aiWeaponTrial(ai, best, [...c.group, 0], c.tries, c.seedArg, {
      ammo: (w) => (c.delayed[w] && !c.noDelayGate ? 0 : c.ammo[w]),
      weight: (w) => c.weights[w],
      evaluate: (family, weapon, plan) => {
        const r = evaluate(family, weapon, plan);
        calls.push({ operation: "evaluate", request: [family, weapon], result: r });
        return r;
      },
    });
    const label = `case${index}`;
    expect(best, label).toEqual(c.plan);
    expect(ai.seed >>> 0, label).toBe(c.seed);
    expect(calls, label).toEqual(c.calls);
    expect(ai.picker.entries, label).toEqual(c.picker);
  }
});

test("004CF130 blast outcome estimate", { tag: "@logic" }, () => {
  for (const [index, c] of cases.blast.entries()) {
    const { ai, worms, world: w } = blastSetup(c);
    const [exclude, x, y, radius, damage] = c.args;
    expect(aiBlastEstimate(ai, worms, w, x, y, radius, damage, exclude), `case${index}`).toEqual([c.enemy, c.friendly]);
  }
});

const FNV = (h, v) => {
  for (let i = 0; i < 4; i++) h = Math.imul(h ^ ((v >>> (8 * i)) & 0xff), 0x01000193) >>> 0;
  return h;
};
test("004F3490 ballistic solver with 004F32D0 terrain probe", { tag: "@logic" }, () => {
  let solved = 0;
  for (const [index, c] of cases.ballistic.entries()) {
    const { ai, worms, world: w } = blastSetup(c);
    let probes = 0, hash = 0x811c9dc5;
    const [x0, y0, tx, ty, ax, ay, ticks, radius, damage, allowMiss] = c.args;
    const host = {
      solid: (x, y) => {
        probes++; hash = FNV(FNV(hash, x), y);
        return c.terrain.some(([l, t, r, b]) => l <= x && x <= r && t <= y && y <= b);
      },
      closedTop: c.scene[0x1b8ac], bordered: c.scene[0x11d67],
      estimate: (x, y, r, d) => aiBlastEstimate(ai, worms, w, x, y, r, d, 0),
    };
    const plan = aiBallisticShot({ weapon: c.weapon, record: WEAPONS + c.weapon * 0x208, launch: c.launch,
      x0, y0, tx, ty, ax, ay, ticks, radius, damage, allowMiss }, host);
    const label = `case${index}`;
    expect(plan ? 1 : 0, label).toBe(c.result);
    expect([probes, hash], label).toEqual([c.probes, c.probeHash]);
    const words = new Array(24).fill(0x1234567);
    if (plan) { solved++; for (const [k, v] of Object.entries(plan)) words[k] = v; }
    expect(words, label).toEqual(c.plan);
  }
  expect(solved).toBeGreaterThan(50);
});

const pick = (out, keys) => Object.fromEntries(keys.map((k) => [k, out[k]]));
const AI_KEYS = ["action", "state", "delay", "replanned", "fuse", "seed", "aim", "power", "facing", "gunAim", "gunFacing"];
const start = (c) => ({ action: 0, state: 0, delay: 0, replanned: 0, fuse: 0, seed: 0, aim: 0, power: 0, facing: 0,
  gunAim: 0, gunFacing: 0, skill: 0, ...c.ai, seed: (c.ai.seed ?? 0) | 0 });

test("004F2FD0 ballistic fire setup with skill jitter", { tag: "@logic" }, () => {
  for (const [index, c] of cases.fireSetup.entries()) {
    const ai = start(c), e = c.entry;
    const hasFuse = e.kind === 1 && (e.fixed === 0 || (e.secondary === 1 && e.secondaryFixed === 0));
    aiBallisticFireSetup(ai, { hasFuse, selected: c.selected });
    expect(pick(ai, AI_KEYS), `case${index}`).toEqual(pick(c.out, AI_KEYS));
  }
});

test("004F3190/004F3250/004F2780/004F2830 aim, charge and gun steps", { tag: "@logic" }, () => {
  for (const [index, c] of cases.aimStep.entries()) {
    const ai = start(c), [phase, aim, charge] = c.snapshot;
    if (c.step === "aim") aiAimStep(ai, { wormState: c.wormState, aim });
    else if (c.step === "gunAim") aiAimStep(ai, { wormState: c.wormState, aim }, true);
    else if (c.step === "charge") aiChargeStep(ai, { phase, charge });
    else aiGunSetup(ai, { selected: c.selected });
    expect(pick(ai, AI_KEYS), `case${index} ${c.step}`).toEqual(pick(c.out, AI_KEYS));
  }
});

test("004D0760 action codes become controller events", { tag: "@logic" }, () => {
  for (const [index, c] of cases.actions.entries()) {
    const label = `case${index} code${c.code}`;
    const ai = { ...c.ai, action: c.code };
    // 004D02C0 returns -1 (stop), 0 (idle frame) or 1 (act); the event stream only follows 1.
    const events = c.think === 1 ? aiActionEvents(ai, c.current) : [];
    expect(c.result, label).toBe(c.think === -1 ? 0 : 1);
    expect(events.map(([event, words]) => ({ operation: "event", request: [0x14, 0, event, words.length * 4, words] })), label)
      .toEqual(c.calls);
    expect(c.action, label).toBe(c.think === 1 && c.current ? 0 : c.code);
  }
});

test("004F3F00/004F39A0 ballistic candidate search over reachable positions", { tag: "@logic" }, () => {
  let found = 0;
  for (const [index, c] of cases.search.entries()) {
    const label = `case${index}`;
    const own = c.worms.find((w) => w.own);
    const live = c.worms.filter((w) => (w.type ?? 2) === 2 && (w.msgResult ?? 1) !== 0).map((w) => ({ ...w, self: !!w.own }));
    const self = live.find((w) => w.self);
    const ai = { ...c.ai, seed: c.ai.seed | 0, x: own.x, y: own.y };
    const w = world(c), calls = [];
    let probes = 0, hash = 0x811c9dc5, flags = c.ownFlags;
    const host = {
      positions: c.positions,
      ammo: () => c.ammo, wind: () => c.wind, gravity: () => c.gravity,
      enemies: () => live.map((m) => ({ team: m.team, x: m.x, y: m.y })),
      ownPosition: () => [self.x, self.y],
      teleport: (x, y) => {
        const ok = c.blocked.some(([bx, by]) => bx === x >> 16 && by === y >> 16) ? 0 : 1;
        if (ok) { self.x = x; self.y = y; }
        calls.push({ operation: "teleport", request: [x, y], result: ok });
        return ok;
      },
      wormFlags: () => { calls.push({ operation: "flags", request: [], result: flags }); return flags; },
      setWormFlags: (v) => { calls.push({ operation: "setFlags", request: [v] }); flags = v; },
      yield: () => calls.push({ operation: "yield", request: [] }),
      solid: (x, y) => {
        probes++; hash = FNV(FNV(hash, x), y);
        return c.terrain.some(([l, t, r, b]) => l <= x && x <= r && t <= y && y <= b);
      },
      closedTop: c.scene[0x1b8ac], bordered: c.scene[0x11d67],
      estimate: (x, y, r, d) => aiBlastEstimate({ ...ai, x: self.x, y: self.y }, live, w, x, y, r, d, 0),
    };
    const r = c.record;
    const adjustableFuse = r.kind === 1 && (r.fuseMs === 0 || (r.mode === 1 && r.secondaryFixed === 0));
    const plan = new Array(24).fill(0x2468ace);
    const result = aiBallisticEvaluate(ai, plan, c.weapon, { ...r, address: WEAPONS + c.weapon * 0x208 }, adjustableFuse, host);
    expect(result, label).toBe(c.result);
    expect(calls, label).toEqual(c.calls);
    expect([probes, hash], label).toEqual([c.probes, c.probeHash]);
    // Words 0 and 5 of a found plan come from the original's uninitialized stack record.
    const keep = (p) => p.filter((_, k) => !result || (k !== 0 && k !== 5));
    expect(keep(plan), label).toEqual(keep(c.plan));
    expect(ai.seed >>> 0, label).toBe(c.seed);
    found += result;
  }
  expect(found).toBeGreaterThan(15);
});
