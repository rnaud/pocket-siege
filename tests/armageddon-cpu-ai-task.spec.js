import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/cpu-ai-task.json" with { type: "json" };
import { createAiTask, aiTaskStep, aiLogicRandom, aiWormAbove } from "../src/armageddon/cpu-ai-task.js";

const { cases } = fixture;
const EFFECT_FIELDS = ["state", "nextState", "action", "delay", "replanned", "retries", "fuse", "x", "y", "targetMode"];

function newTask(c) {
  return createAiTask({ team: c.team, skill: c.skill, aggression: c.aggression, seed: c.seed,
    wormCount: c.wormCount ?? c.worms.length, wormHealth: (team, worm) => (c.health[worm] ?? 0) });
}

test("004CCFA0 AI task constructor", { tag: "@logic" }, () => {
  for (const [index, c] of cases.constructor.entries()) {
    const task = newTask(c);
    const out = Object.fromEntries(Object.keys(c.out).map((k) => [k, task[k]]));
    expect(out, `case${index}`).toEqual(c.out);
    expect(c.registered).toEqual([0x12, c.team, 1]);
    expect([c.result, c.classId, c.coroutineStack, c.coroutineState, c.queue, c.picker, c.land])
      .toEqual([1, 0x1f, 0x10000, 0, 1, 1, 0]);
  }
});

function snapshot(task, scene) {
  const { walk } = task;
  return {
    team: task.team, aggression: task.aggression, skill: task.skill, state: task.state, nextState: task.nextState,
    action: task.action, retries: task.retries, field2930: task.field2930, delay: task.delay, fuse: task.fuse,
    x: task.x, y: task.y, targetMode: task.targetMode, replanned: task.replanned, firstWorm: task.firstWorm,
    plannedWorm: task.plannedWorm, seed: task.seed, targetTeam: task.targetTeam, targetWorm: task.targetWorm,
    livingWorms: task.livingWorms, backflips: task.backflips, running: task.running, walkPath: walk.path,
    walkStep: walk.step, walkX: walk.x, walkY: walk.y, walk2928: walk.field2928,
    walkRaw: ((walk.y << 16) | (walk.x & 0xffff)) | 0, walkRaw2: walk.path, plan: [...task.plan],
    teamSnapshot: [...task.teamSnapshot.slice(0, 6)], rootSnapshot: [...task.rootSnapshot.slice(0, 9)],
    wormSnapshot: [...task.wormSnapshot.slice(0, 20)], sceneThinking: task.running, logicSeed: scene.seed,
  };
}

function runHost(c, task, world, log, scene) {
  const queues = c.queues ?? {};
  const cursor = {};
  const take = (name, fallback) => {
    const i = cursor[name] ?? 0; cursor[name] = i + 1;
    return i < (queues[name]?.length ?? 0) ? queues[name][i] : fallback;
  };
  const apply = (effect) => { for (const [name, value] of Object.entries(effect)) task[name] = value; };
  return {
    currentWorm: () => world.cur,
    queryTeam: () => [world.busy, world.active, world.menu, world.canAttack, world.selected, world.shotFired],
    // 004B7970 (match ended 004B39A0 and first panel team 004EC310 are data here).
    queryRoot: () => [world.r14c ? 0 : world.rTeam, world.r140, world.ended, world.r150 || world.r154 ? 1 : 0,
      !world.rTeam ? -1 : world.r174 ? 0 : world.r188, world.r180, world.rTeam, world.rWorm, world.panel],
    // 004DF270: body+0xFC/+0x100, state, then body words.
    queryWorm: (team, worm) => (world.wormMissing && worm === world.cur ? null : [team, worm, world.status, ...world.body]),
    wormTarget: () => [world.tgtTeam, world.tgtWorm],
    wormState: () => world.status,
    wormPosition: () => [world.wx, world.wy],
    wormThink: () => log.push(["message", 0x402]),
    execute: (state) => { log.push(["execute", state]); apply(take("execute", {})); },
    walkStep: () => { log.push(["walkStep"]); const [r, e] = take("walkStep", [0, {}]); apply(e); return r; },
    walkPlan: () => { log.push(["walkPlan"]); const [r, e] = take("walkPlan", [0, {}]); apply(e); return r; },
    hazard: () => { log.push(["hazard"]); return take("hazard", 0); },
    floodFill: (x, y) => {
      log.push(["floodFill", x, y]);
      const r = take("floodFill", [0]);
      if (r[0]) {
        r[1].forEach(([px, py, path, step], i) => { task.positions[i] = [px, py, path]; task.pathSteps[path] = step; });
        task.positionCount = r[1].length;
      }
      return r[0];
    },
    fleeSearch: () => {
      const count = task.positionCount;
      log.push(["flee", 0x20f0, count, 0, 0, 0]);
      return (take("flee", 0) % (count + 1)) - 1;
    },
    itemDistance: (x, y, radius) => { log.push(["item", x, y, radius]); const [ok, d] = take("item", [0, 0]); return ok ? d : null; },
    teleportSearch: () => { log.push(["teleportSearch"]); const [ok, x, y] = take("teleport", [0, 0, 0]); return ok ? [x, y] : null; },
    shotSearch: (plan) => {
      log.push(["shotSearch", 0x2958, task.seed]);
      for (const [k, v] of Object.entries(take("shot", {}))) plan[k] = v;
    },
    settling: () => { log.push(["settling"]); return world.settle; },
    water: () => [c.water, c.rise],
    logicRandom: () => { log.push(["logicRandom"]); return aiLogicRandom(scene); },
    wormAbove: () => {
      log.push(["wormAbove"]);
      const worms = c.registry.map((r) => r.own
        ? { self: r.worm === world.cur, type: r.type, x: world.wx, y: world.wy } : { type: r.type, x: r.x, y: r.y });
      return aiWormAbove([world.wx, world.wy], worms);
    },
  };
}

test("004D0C60/004D0760/004D02C0 AI task frames with 004CD460/004CDC10", { tag: "@logic" }, () => {
  expect(EFFECT_FIELDS.length).toBe(10);
  for (const [index, c] of cases.runs.entries()) {
    const task = newTask(c);
    task.retries = c.retries;
    if (c.preset) {
      Object.assign(task, c.preset.fields);
      c.preset.plan.forEach((v, i) => { task.plan[i] = v; });
      c.preset.positions.forEach(([x, y, path, step], i) => { task.positions[i] = [x, y, path]; task.pathSteps[path] = step; });
      task.positionCount = c.preset.positions.length;
    }
    const scene = { seed: c.seed, frame: c.frame };
    const world = {}, expected = {}, log = [];
    const host = runHost(c, task, world, log, scene);
    for (const [f, frame] of c.frames.entries()) {
      Object.assign(world, frame.world);
      for (const [k, v] of Object.entries(frame.out)) {
        if (Array.isArray(expected[k]) && !Array.isArray(v)) for (const [i, w] of Object.entries(v)) expected[k][i] = w;
        else expected[k] = Array.isArray(v) ? [...v] : v;
      }
      log.length = 0;
      const result = aiTaskStep(task, host);
      const actual = { calls: log, events: result.events, status: result.destroyed ? "destroyed" : result.finished ? "finished" : "running",
        task: snapshot(task, scene) };
      const want = { calls: frame.calls, events: frame.events, status: frame.status, task: expected };
      // Deep comparison only on mismatch: 30k frames.
      if (JSON.stringify(actual) !== JSON.stringify(want)) expect(actual, `run${index} frame${f}`).toEqual(want);
    }
  }
});
