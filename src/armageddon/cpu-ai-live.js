// Live composition of the original CPU-team AI (WA 3.0.0.0, task vtable
// 00526958): the 004CCFA0 task stepper (cpu-ai-task.js) wired to the
// movement layer (cpu-ai-movement.js), the weapon families and execution
// states (cpu-ai-weapons.js) and the ballistic family (cpu-ai.js). This file
// only routes host callbacks; it adds no decisions of its own.
//
// One task object holds every AI field the modules share:
//   AI+0xF0   buffer (paths), pathSteps = buffer+4 (AI+0xF4 indexed by path)
//   AI+0x20F0 positions/positionCount (flood fill 1, 004CE690)
//   AI+0x24F4 spots2/escapes (flood fill 2, 004CE730)
//   AI+0x2904 walk {x, y, path, step} = movement toX/toY/cursor/step
//   AI+0x292C retries = movement failures
//   AI+0x2958 plan (impact words 15/16 = movement impactX/impactY)
// Where cpu-ai-weapons.js and cpu-ai-movement.js both port a routine
// (004CEA30/004CE920/004CEFD0/004D0170), the task-level callbacks use the
// movement versions; the weapon execution states keep calling their own copies.
//
// Host adapter (all coordinates 16.16, native y-down, unless "pixels"):
//   team, skill, aggression, seed (scene+0x1ACC), livingWorms (AI+0x2DB4)
//   snapshot() once per frame -> {
//     currentWorm, controls: [blocked, active, menu, canAttack, selected, fired],
//     root: {team, turnLeftMs, matchMs, suddenDeath, ended},
//     worm: {state (vt+0x7C), aim, charge, weapon (+0x3C, fixed weapon)},
//     position: [x, y], moving, worms: [{team, worm, x, y, hp, alliance, self}],
//     objects: [{type (10 mine, 11/12 crate, 15 projectile, 17 barrel), x, y, inactive, armed}],
//     flames: [[x, y]], water (pixels), waterRise, wind, gravity, settling,
//     closedTop, bordered }
//   collide(x, y)   worm body at (x, y) overlaps terrain or another body
//   solid(x, y)     landscape pixel (pixels, y-down)
//   ammo(slot)      004C2EE0 (-1 infinite)
//   logicRandom()   shared 004EE960 draw
//   place(x, y)     optional: commit a real worm teleport (path end / drop snap)
//   recordWord(slot, offset) optional weapon record word (defaults to scheme 195)
import schemeWeaponData from "./scheme-weapon-data.json" with { type: "json" };
import { createAiTask, aiTaskStep, aiTaskDestroy, aiWormAbove } from "./cpu-ai-task.js";
import {
  AI_PATH_BUFFER_SIZE, createAiPathfinder, aiBuildReachable, aiPathExecute, aiPathAdvance, aiChooseSpot,
  aiImminentExplosion, aiRetreatStep,
} from "./cpu-ai-movement.js";
import {
  aiSearchOrder, aiGunEvaluate, aiGunAfterShot, aiMeleeEvaluate, aiMeleeState, aiDropEvaluate, aiDropState,
  aiStrikeEvaluate, aiStrikeState, aiTeleportSearch, aiTeleportState,
} from "./cpu-ai-weapons.js";
import {
  aiBallisticEvaluate, aiBallisticFireSetup, aiAimStep, aiChargeStep, aiGunSetup, aiBlastEstimate,
} from "./cpu-ai.js";

const RECORDS = schemeWeaponData.schemes.find((scheme) => scheme.resource_id === 195).weapons;
export const defaultRecordWord = (slot, offset) => RECORDS[slot]?.[(offset - 0x48) / 4] | 0;
export const AI_FAMILY_NAMES = { 0: null, 1: "drop", 2: "gun", 3: "ballistic", 4: "strike", 5: "melee" };

function ballisticRecord(word, slot) {
  const at = (offset) => word(slot, offset);
  return { launch: at(0x6c), kind: at(0x68), fuseMs: at(0xc4), impact: at(0x80), mode: at(0x128),
    blast: at(0x8c), extra: at(0x150), extraCount: at(0x130), wind: at(0xb4), gravity: at(0xbc),
    acceptMiss: at(0x204), secondaryFixed: at(0x188) };
}
// 004AAC50 first output (fuse adjustable under the scheme), as used by the
// previous ballistic integration.
const adjustableFuse = (record) => record.kind === 1 &&
  (record.fuseMs === 0 || (record.mode === 1 && record.secondaryFixed === 0));

function alias(object, name, get, set) {
  Object.defineProperty(object, name, { get, set, enumerable: false, configurable: true });
}

// Build the task (004CCFA0) and the shared state the three modules expect.
export function createLiveAi(host, { modelYields = true } = {}) {
  const task = createAiTask({ team: host.team, skill: host.skill, aggression: host.aggression, seed: host.seed,
    livingWorms: host.livingWorms });
  task.buffer = new Uint8Array(AI_PATH_BUFFER_SIZE);
  task.pathSteps = task.buffer.subarray(4);
  Object.assign(task, { used: 0, spots1: [], spots2: [], count1: 0, count2: 0, escapes: [], skipFill: 0,
    pathfinder: createAiPathfinder(), stall: 0, fromX: 0, fromY: 0, jumpIssued: 0, target: [0, 0, 0] });
  alias(task, "failures", () => task.retries, (v) => { task.retries = v | 0; });
  alias(task, "cursor", () => task.walk.path | 0, (v) => { task.walk.path = v | 0; });
  alias(task, "step", () => task.walk.step | 0, (v) => { task.walk.step = v | 0; });
  alias(task, "toX", () => task.walk.x | 0, (v) => { task.walk.x = v | 0; });
  alias(task, "toY", () => task.walk.y | 0, (v) => { task.walk.y = v | 0; });
  alias(task, "impactX", () => task.plan[15], (v) => { task.plan[15] = v | 0; });
  alias(task, "impactY", () => task.plan[16], (v) => { task.plan[16] = v | 0; });
  const ai = { task, host, modelYields, snap: null, pos: [0, 0], flags: 0, parked: 0, pending: [], yields: 0,
    frames: 0, totalYields: 0, finished: false, destroyed: false, registry: [], self: null, events: [] };
  ai.recordWord = host.recordWord ?? defaultRecordWord;
  buildHosts(ai);
  return ai;
}

function buildHosts(ai) {
  const { task, host } = ai;
  const snap = () => ai.snap;
  const yieldNow = () => { ai.yields++; };
  const teleport = (x, y) => {
    // Restores after a search run with flags 2 (004F39A0 and friends) and must not fail.
    if (ai.flags !== 2 && host.collide(x | 0, y | 0)) return 0;
    ai.pos = [x | 0, y | 0];
    if (ai.self) { ai.self.x = ai.pos[0]; ai.self.y = ai.pos[1]; }
    return 1;
  };
  const wormFlags = () => ai.flags, setWormFlags = (v) => { ai.flags = v | 0; };
  const healthOf = (team, worm) => ai.registry.find((t) => t.type === 2 && t.team === team && t.worm === worm)?.hp ?? 0;
  const world = {
    damageScale: 1, rangeWord: 0, health: healthOf, altHealth: healthOf, teamFlag: () => 0, ally: () => 0,
    double: () => false,
    alliance: (team) => ai.registry.find((t) => t.type === 2 && t.team === team)?.alliance ?? team,
    pixel: (x, y) => host.solid(x | 0, y | 0),
    get water() { return snap().water | 0; },
  };
  const wormsOnly = () => ai.registry.filter((t) => t.type === 2);
  const positions = () => task.positions.slice(0, Math.max(0, task.positionCount));
  const move = {
    collide: (x, y) => host.collide(x | 0, y | 0), gravity: () => snap().gravity | 0,
    get water() { return snap().water | 0; },
    get flames() { return snap().flames; },
    get mines() { return ai.registry.filter((t) => t.type === 10); },
    moving: () => (snap().moving ? 1 : 0), state: () => snap().worm.state, yield: yieldNow,
    wormFlags, setWormFlags, wormState: () => snap().worm.state, position: () => ai.pos, teleport,
    get tasks() { return ai.registry; }, world,
  };
  const weapons = {
    tasks: () => ai.registry, ownPosition: () => ai.pos, teleport, wormFlags, setWormFlags, yield: yieldNow,
    solid: (x, y) => host.solid(x | 0, y | 0), blocked: (x, y) => host.solid(x | 0, y | 0),
    collides: (mask, x, y) => host.collide(x | 0, y | 0),
    get water() { return snap().water | 0; },
    wind: () => snap().wind | 0, gravity: () => snap().gravity | 0,
    ammo: (slot) => host.ammo(slot), weight: (slot) => ai.recordWord(slot, 0x200),
    estimate: (x, y, radius, damage, exclude = 0) => aiBlastEstimate(task, wormsOnly(), world, x, y, radius, damage, exclude),
    get positions() { return positions(); },
    pathfind: (x, y) => (aiBuildReachable(task, x, y, 2, move) ? task.spots2 : []),
    routeByte: (path) => task.buffer[(path + 4) | 0] | 0,
    enemies: () => wormsOnly().map((t) => ({ team: t.team, x: t.x, y: t.y })),
    world,
    get canAttack() { return task.teamSnapshot[3]; },
    get forced() { return task.teamSnapshot[5]; },
    get selected() { return task.teamSnapshot[4]; },
    get wormWeapon() { return task.wormSnapshot[15]; },
    get airStrikeAllowed() { return snap().closedTop ? 0 : 1; },
    get closedTop() { return snap().closedTop ? 1 : 0; },
    get bordered() { return snap().bordered ? 1 : 0; },
    register: () => {}, logicRandom: () => host.logicRandom(),
    evaluate: (family, slot, plan) => evaluateFamily(ai, family, slot, plan, weapons),
  };
  const taskHost = {
    currentWorm: () => snap().currentWorm | 0,
    queryTeam: () => snap().controls,
    queryRoot: () => {
      const r = snap().root, current = snap().currentWorm | 0;
      // Word layout as decoded for 004B7970 (see cpu-ai-task spec): current team,
      // +0x140, match ended, sudden death, turn time left (ms), match time, team, worm stamp.
      return [r.team, 0, r.ended ? 1 : 0, r.suddenDeath ? 1 : 0, r.turnLeftMs | 0, r.matchMs | 0, r.team, current, r.team];
    },
    queryWorm: (team, worm) => {
      const s = snap().worm;
      if (!s) return null;
      const words = new Array(0x55).fill(0);
      words[0] = team; words[1] = worm; words[2] = s.state; words[3] = s.aim | 0; words[4] = s.charge | 0;
      words[15] = s.weapon | 0;
      return words;
    },
    wormTarget: () => [0, 0],
    wormState: () => snap().worm.state,
    wormPosition: () => ai.pos,
    wormThink: () => {},
    execute: (state) => executeState(ai, state, move, weapons),
    walkStep: () => aiPathExecute(task, move),
    walkPlan: () => aiPathAdvance(task, move),
    hazard: () => aiImminentExplosion(ai.registry, world),
    floodFill: (x, y) => {
      const result = aiBuildReachable(task, x, y, 1, move);
      // AI+0x20F0 keeps stale entries past the count.
      task.spots1.forEach(([px, py, path], i) => { task.positions[i] = [px, py, path]; });
      task.positionCount = result ? task.spots1.length : 0;
      return result;
    },
    fleeSearch: () => aiChooseSpot(task, positions(), 0, 0, 0, ai.pos, ai.registry, world),
    itemDistance: (x, y, mask) => {
      let best = null;
      for (const t of ai.registry) {
        if (!((1 << (t.type & 31)) & mask)) continue;
        const d = (Math.abs((y - t.y) | 0) + Math.abs((x - t.x) | 0)) | 0;
        if (best === null || best > d) best = d;
      }
      return best;
    },
    teleportSearch: () => aiTeleportSearch(task, weapons, task.wormSnapshot[15]),
    shotSearch: (plan) => aiSearchOrder(task, plan, weapons),
    settling: () => (snap().settling ? 1 : 0),
    water: () => [snap().water | 0, snap().waterRise | 0],
    logicRandom: () => host.logicRandom(),
    wormAbove: () => aiWormAbove(ai.pos, wormsOnly()),
  };
  Object.assign(ai, { move, weapons, taskHost, world });
}

// 004CE7D0 family dispatch with the weapon record words each evaluator reads.
function evaluateFamily(ai, family, slot, plan, host) {
  const { task } = ai, word = (offset) => ai.recordWord(slot, offset);
  switch (family) {
    case "ballistic": {
      const record = ballisticRecord(ai.recordWord, slot);
      return aiBallisticEvaluate(task, plan, slot, record, adjustableFuse(record), host);
    }
    case "gun":
      return aiGunEvaluate(task, plan, slot, { range: word(0xa0), pellets: word(0x94), damage: word(0x80) }, host);
    case "melee":
      return aiMeleeEvaluate(task, plan, slot, { damage: word(0x70), rise: word(0x7c) }, host);
    case "drop":
      return aiDropEvaluate(task, plan, slot, { kind: word(0x70), blast: word(0x8c), mode: word(0x128),
        extra: word(0x150), extraCount: word(0x130) }, host);
    case "strike":
      return aiStrikeEvaluate(task, plan, slot, { aimed: word(0xc8), count: word(0x74), spacing: word(0x78),
        speed: word(0x7c), windPct: word(0x6c),
        bomb: { blast: word(0xa0), mode: word(0x13c), extra: word(0x164), extraCount: word(0x144) } }, host);
    default: return 0;
  }
}

// Execution routines 0x67..0x7A (AI_EXECUTE_ROUTINES).
function executeState(ai, state, move, weapons) {
  const { task } = ai, wormState = ai.snap.worm.state, team = task.teamSnapshot, worm = task.wormSnapshot;
  if (state === 0x67) {
    aiBallisticFireSetup(task, { hasFuse: adjustableFuse(ballisticRecord(ai.recordWord, task.weapon)), selected: team[4] });
  } else if (state === 0x68) aiAimStep(task, { wormState, aim: worm[3] });
  else if (state === 0x69) aiChargeStep(task, { phase: worm[2], charge: worm[4] });
  else if (state === 0x6a) aiRetreatStep(task, move);
  else if (state === 0x6c) aiGunSetup(task, { selected: team[4] });
  else if (state === 0x6d) aiAimStep(task, { wormState, aim: worm[3] }, true);
  else if (state === 0x6e) aiGunAfterShot(task, task.plan, { wormState, canAttack: team[3] }, weapons);
  else if (state >= 0x6f && state <= 0x71) aiDropState(task, task.plan, { wormState }, weapons);
  else if (state >= 0x72 && state <= 0x74) aiStrikeState(task, task.plan, { wormState }, weapons);
  else if (state >= 0x75 && state <= 0x77) aiTeleportState(task, { wormState });
  else if (state >= 0x78 && state <= 0x7a) aiMeleeState(task, task.plan, { wormState, selected: team[4] }, weapons);
}

function buildRegistry(ai, snap) {
  const registry = [];
  ai.self = null;
  for (const w of snap.worms) {
    const entry = { type: 2, team: w.team, worm: w.worm, x: w.x | 0, y: w.y | 0, hp: w.hp | 0, alliance: w.alliance,
      self: Boolean(w.self), snapshot: 1, inactive: 0, armed: 0, msg5: 0, msg6: 0 };
    if (entry.self) { ai.self = entry; entry.x = ai.pos[0]; entry.y = ai.pos[1]; }
    registry.push(entry);
  }
  for (const o of snap.objects) {
    registry.push({ type: o.type, x: o.x | 0, y: o.y | 0, team: 0, worm: 0, self: false, snapshot: 0,
      inactive: o.inactive ? 1 : 0, armed: o.armed ? 1 : 0, msg5: o.inactive ? 1 : 0, msg6: o.armed ? 1 : 0 });
  }
  ai.registry = registry;
}

// One frame event 0x3EA. Returns the controller events [[event, words]] to
// apply this frame. With modelYields, every coroutine yield inside a think
// step (flood fill, searches) holds that step's events for one more frame,
// as the original resumes the step on later frames.
export function stepLiveAi(ai) {
  if (ai.destroyed || ai.finished) return [];
  ai.frames++;
  if (ai.parked > 0) {
    ai.parked--;
    if (ai.parked) return [];
    const events = ai.pending;
    ai.pending = [];
    ai.events = events;
    return events;
  }
  const snap = ai.host.snapshot();
  ai.snap = snap;
  ai.pos = [snap.position[0] | 0, snap.position[1] | 0];
  buildRegistry(ai, snap);
  ai.yields = 0;
  const result = aiTaskStep(ai.task, ai.taskHost);
  ai.totalYields += ai.yields;
  if (ai.pos[0] !== (snap.position[0] | 0) || ai.pos[1] !== (snap.position[1] | 0)) ai.host.place?.(ai.pos[0], ai.pos[1]);
  if (result.finished) ai.finished = true;
  if (ai.modelYields && ai.yields > 0) {
    ai.parked = ai.yields;
    ai.pending = result.events;
    ai.events = [];
    return [];
  }
  ai.events = result.events;
  return result.events;
}

export function destroyLiveAi(ai) {
  if (ai.destroyed) return 0;
  ai.destroyed = true;
  return aiTaskDestroy(ai.task);
}

// Debug view of the live plan (AI+0x2958) and state.
export function liveAiPlan(ai) {
  const { task } = ai, plan = task.plan;
  return {
    state: task.state, nextState: task.nextState, family: AI_FAMILY_NAMES[plan[6]] ?? null, slot: plan[1],
    worm: plan[0], enemy: plan[3], friendly: plan[4], aim: task.aim, power: task.power, fuse: task.fuse,
    facing: plan[22], walking: task.state === 0x66, retries: task.retries, finished: ai.finished,
    parked: ai.parked, frames: ai.frames, yields: ai.totalYields,
    path: task.state === 0x66 ? { step: task.step, x: task.toX, y: task.toY, stall: task.stall } : null,
    position: [ai.pos[0] >> 16, ai.pos[1] >> 16],
  };
}
