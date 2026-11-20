// Control flow of the original CPU-team AI task of WA 3.0.0.0 (vtable 00526958,
// 0x2DD4 bytes) as a per-frame stepper.
//
// Lifetime: the team controller (004E6810) builds the task on turn activation
// (event 0x41C) when controller+0x44 < 0: 004CCFA0(controller, team = +0x3C,
// skill = -(+0x44), aggression = +0x88), then lowers +0x88 by 15 (min 0). The
// constructor registers the task as class 0x12 / id team; deactivation (0x41F)
// destroys it through that lookup (and raises +0x88 by 40, max 100, when +0x58).
//
// Coroutine: 004D0C30 handles only frame event 0x3EA and calls vtable+0x2C
// (004F0D80). The first call starts the body 004D0C60 on a private 0x10000-byte
// stack, later calls longjmp back to the last yield (vtable+0x28, 004F0D40).
// The body loops { +0x2DD0 = 1; scene+0x1D428++; r = think 004D0760; yield;
// scene+0x1D428--; +0x2DD0 = 0 } while r != 0. When it returns, that frame's
// resume still reports 1; on the next frame 004F0D80 reports 0 and the handler
// deletes the task (004CD120). So scene+0x1D428 stays 1 while the AI is parked
// between frames. Long callees (004F39A0 inside the shot search) yield again in
// the middle of a think step; host callbacks may model that by returning an
// iterator (it is run with yield*).
//
// One think step 004D0760 = dispatcher 004D02C0, then (dispatcher result 1 and
// a current worm) the action code AI+0xEC becomes controller events
// (aiActionEvents), each sent to task class 0x14 with 004B26A0.
import { aiActionEvents } from "./cpu-ai.js";

export const AI_STATE = {
  RETRY: 0x64, DONE: 0x65, WALK: 0x66, BALLISTIC_SETUP: 0x67, BALLISTIC_AIM: 0x68, BALLISTIC_CHARGE: 0x69,
  AFTER_SHOT: 0x6a, WAIT_IDLE: 0x6b, GUN_SETUP: 0x6c, GUN_AIM: 0x6d, GUN_FIRE: 0x6e, STRIKE: 0x6f,
  MELEE: 0x72, TELEPORT: 0x75, UTILITY: 0x78, PLAN: 0x7b, NEXT_WORM: 0x7c, EXECUTE: 0x7d, SKIP: 0x7e,
};
// Execution routines the dispatcher calls (host.execute(state, task)).
export const AI_EXECUTE_ROUTINES = {
  0x67: 0x4f2fd0, 0x68: 0x4f3190, 0x69: 0x4f3250, 0x6a: 0x4f3e50, 0x6c: 0x4f2780, 0x6d: 0x4f2830, 0x6e: 0x4f2900,
  0x6f: 0x4f1ac0, 0x70: 0x4f1b10, 0x71: 0x4f1bb0, 0x72: 0x4f1270, 0x73: 0x4f12e0, 0x74: 0x4f1350, 0x75: 0x4f0e80,
  0x76: 0x4f0ea0, 0x77: 0x4f0f10, 0x78: 0x4f2220, 0x79: 0x4f2270, 0x7a: 0x4f2310,
};
// Plan word aliases used by the execution routines (plan = AI+0x2958).
const PLAN_ALIASES = { weapon: 1, flightTicks: 10, gunAim: 16, gunFacing: 17, aim: 19, power: 20, facing: 22 };
const SNAPSHOT_WORDS = 0x55; // 0x154-byte message buffers

// 004CCFA0. seed = scene+0x1ACC at construction; livingWorms (+0x2DB4) counts
// worms 1..wormCount(team) whose health (004C2CC0) is nonzero.
export function createAiTask({ team, skill, aggression, seed, wormCount = 0, wormHealth = () => 0, livingWorms }) {
  const clamp = (v) => (v > 0 ? (v < 100 ? v : 100) : 0) | 0; // 0049BF90(v, 0, 100)
  let living = 0;
  if (livingWorms !== undefined) living = livingWorms | 0;
  else for (let worm = 1; worm <= wormCount; worm++) if (wormHealth(team, worm)) living++;
  const task = {
    team: team | 0, skill: clamp(skill), aggression: clamp(aggression), action: 0, seed: seed | 0,
    state: AI_STATE.RETRY, nextState: 0, delay: 10, replanned: 0, field2930: 0,
    retries: 0,        // +0x292C (walk failures, owned by 004CFD20/004CFF20)
    firstWorm: 0,      // +0x294C current worm when this planning round began
    plannedWorm: 0,    // +0x2950 worm whose reachable positions were last flood-filled
    backflips: 0,      // +0x2DB8
    livingWorms: living, // +0x2DB4 (cpu-ai.js names it "teams")
    fuse: 0, x: 0, y: 0, targetMode: 0, // +0x2938..+0x2944 (set by execution routines)
    walk: { x: 0, y: 0, path: 0, step: 0, field2928: 0 }, // +0x2904..+0x2928
    targetTeam: 0, targetWorm: 0, // +0x28FC/+0x2900 (004C3230, per-worm target in team data)
    plan: new Array(24).fill(0),
    teamSnapshot: new Int32Array(SNAPSHOT_WORDS), rootSnapshot: new Int32Array(SNAPSHOT_WORDS),
    wormSnapshot: new Int32Array(SNAPSHOT_WORDS),
    // AI+0x20F0: 128 reachable positions [x, y, path] (int16, int16, int32) and their count
    // (+0x24F0), written by the flood fill 004CE690; stale entries past the count persist.
    positions: Array.from({ length: 128 }, () => [0, 0, 0]), positionCount: 0,
    pathSteps: new Uint8Array(0x1ffc), // AI+0xF4 indexed by path: nonzero = the worm must walk there
    running: 0,       // +0x2DD0
    coroutine: "start", body: null, host: null,
  };
  for (const [name, index] of Object.entries(PLAN_ALIASES))
    Object.defineProperty(task, name, { get: () => task.plan[index], set: (v) => { task.plan[index] = v | 0; }, enumerable: false });
  // cpu-ai.js names: ai.teams is +0x2DB4, ai.stamp is +0x2B28 (root snapshot word 7, the current worm).
  Object.defineProperty(task, "teams", { get: () => task.livingWorms, enumerable: false });
  Object.defineProperty(task, "stamp", { get: () => task.rootSnapshot[7], enumerable: false });
  return task;
}

// 004CD350
export function aiTaskSetState(task, state) {
  task.replanned = 0; task.delay = 10;
  if (state === 0x69) task.field2930 = 0;
  task.state = state;
}

// 004EE960 (shared logic generator; state = {seed: scene+0x1ACC, frame: scene+0x7F0}).
export function aiLogicRandom(state) {
  state.seed = (Math.imul((state.seed + state.frame) | 0, 0x19660d) + 0x3c6ef35f) | 0;
  return state.seed;
}

// 004CD380: another worm task (type 2) stands on top of the AI worm:
// |dx| <= 10 px and 0 < own y - its y <= 17 px (16.16, y down). worms in registry order.
export function aiWormAbove([ox, oy], worms) {
  for (const worm of worms) {
    if (worm.self || worm.type !== 2) continue;
    if (Math.abs((ox - worm.x) | 0) > 0xa0000) continue;
    if (((oy - worm.y) | 0) > 0x110000) continue;
    if (oy > worm.y) return 1;
  }
  return 0;
}

function* call(value) {
  if (value && typeof value.next === "function") return yield* value;
  return value;
}

// Common "go there, then state `after`" (inline in 004CD460/004CDC10, and 004D0170).
function walkTo(task, index, after) {
  const [x, y, path] = task.positions[index];
  if (!task.pathSteps[path]) { aiTaskSetState(task, after); return 0; }
  aiTaskSetState(task, 0x66);
  task.nextState = after;
  task.walk = { x: x | 0, y: y | 0, path: path | 0, step: 0, field2928: 0 };
  return 1;
}
function nextWormThen(task, after) { task.nextState = after; aiTaskSetState(task, 0x7c); }

// 004F0E40: teleport (weapon 0x28) to (x, y) 16.16 through execution state 0x75.
function teleportTo(task, x, y) {
  task.weapon = 0x28; task.targetMode = 0; task.x = x >> 16; task.y = y >> 16;
  aiTaskSetState(task, 0x75);
}

// 004CD460, state 0x7B: plan (or flee) for the current worm.
function* planState(task) {
  const h = task.host;
  let [x, y] = h.wormPosition();
  if ((yield* call(h.hazard())) && (yield* call(h.floodFill(x, y)))) {           // 004CEC90, 004CE690
    const index = yield* call(h.fleeSearch(task));                                  // 004CE920
    if (index >= 0) { walkTo(task, index, 0x64); return; }
  }
  if (!task.teamSnapshot[5] && task.teamSnapshot[3] && task.rootSnapshot[3]) {
    const [water, rise] = h.water();                                                // scene+0x804, byte scene+0x11D58
    if (((water - Math.imul(rise & 0xff, 5)) | 0) <= (y >> 16)) {
      const spot = yield* call(h.teleportSearch());                                 // 004F10A0
      if (spot && y > spot[1]) { teleportTo(task, spot[0], spot[1]); return; }
    }
  }
  if (!task.replanned) { h.wormThink(); task.delay = 50; task.replanned = 1; return; } // worm message 0x402
  [x, y] = h.wormPosition();
  const current = h.currentWorm(task.team);
  let fresh = !task.firstWorm;
  if (fresh) task.firstWorm = current;
  else if (current !== task.firstWorm) fresh = true;
  if (fresh) {
    task.plannedWorm = current;
    if (h.settling()) return;                                                       // 004EEC10: scene+0x800
    if (!(yield* call(h.floodFill(x, y)))) { nextWormThen(task, 0x7b); return; }
    let found = 0, best = 0, bestIndex = 0, aborted = 0;
    for (let i = 0; i < task.positionCount; i++) {
      const [px, py] = task.positions[i];
      const d = yield* call(h.itemDistance(px << 16, py << 16, 0x1800));            // 004EF0E0 -> null | distance
      if (d === null || d === undefined) { aborted = 1; break; }
      if (d <= 0x1c0000 && (!found || d < best)) { best = d; bestIndex = i; found = 1; }
    }
    if (!aborted && found) {
      const [,, path] = task.positions[bestIndex];
      if (!task.pathSteps[path]) {
        aiTaskSetState(task, 0x64); task.nextState = 0x64; task.action = 0x65; aiTaskSetState(task, 0x6b);
      } else walkTo(task, bestIndex, 0x64);
      return;
    }
    if (!task.teamSnapshot[3]) { nextWormThen(task, 0x7b); return; }
    yield* call(h.shotSearch(task.plan));                                           // 004CE3A0
    if (task.plan[6] && (task.rootSnapshot[4] < 20000 || task.skill < 50)) { aiTaskSetState(task, 0x7d); return; }
    nextWormThen(task, 0x7b);
    return;
  }
  // Back on the worm this round started with.
  if (!task.plan[6]) {
    if (task.livingWorms === 1) {
      if (h.wormAbove() && task.backflips < 5) {                                    // 004CD380
        task.nextState = 0x64; task.action = 0x65; aiTaskSetState(task, 0x6b); task.backflips++;
        return;
      }
    } else h.logicRandom();                                                         // result unused
  }
  if (task.plan[6]) {
    if (!task.plan[3] && !task.teamSnapshot[5] && task.teamSnapshot[3])
      task.seed = (Math.imul(task.seed, 0x19660d) + 0x3c6ef35f) | 0;
    aiTaskSetState(task, 0x7d);
    return;
  }
  if (!task.teamSnapshot[5] && task.teamSnapshot[3]) {
    const spot = yield* call(h.teleportSearch());
    if (spot) {
      task.seed = (Math.imul(task.seed, 0x19660d) + 0x3c6ef35f) | 0;
      if (task.seed & 0x10000) { teleportTo(task, spot[0], spot[1]); return; }
    }
  }
  if (yield* call(h.floodFill(x, y))) {
    const index = yield* call(h.fleeSearch(task));
    if (index >= 0) { walkTo(task, index, 0x7e); return; }
  }
  aiTaskSetState(task, 0x7e);
}

// 004CDC10, state 0x7D: select the planned worm, re-plan from its position with
// the saved seed, then walk (if needed) and hand over to the family's states.
function* executeState(task) {
  const h = task.host;
  const [x, y] = h.wormPosition();
  const current = h.currentWorm(task.team);
  const plan = task.plan;
  if (plan[0] !== current) { nextWormThen(task, 0x7d); return; }
  if (task.plannedWorm !== plan[0]) {
    if (!task.replanned) { h.wormThink(); task.delay = 50; task.replanned = 1; return; }
    task.plannedWorm = current;
    if (!(yield* call(h.floodFill(x, y)))) { nextWormThen(task, 0x7e); return; }
    task.seed = plan[5]; plan[6] = 0;
    yield* call(h.shotSearch(plan));
  }
  switch (plan[6]) {
    case 0: aiTaskSetState(task, 0x64); return;
    case 1: walkTo(task, plan[14], 0x6f); return;
    case 2: walkTo(task, plan[18], 0x6c); return;
    case 3: walkTo(task, plan[23], 0x67); return;
    case 4: walkTo(task, plan[18], 0x72); return;
    case 5: walkTo(task, plan[15], 0x78); return; // 004D0170
    default: return;
  }
}

// 004D02C0: refresh the snapshots, count down the pause and run one state.
// Returns -1 (stop the AI), 0 (nothing this frame) or 1.
export function* aiDispatch(task) {
  const h = task.host;
  task.action = 0;
  const current = h.currentWorm(task.team);                                         // 004C2D20
  if (!current) return -1;
  const team = h.queryTeam(task.team);                                              // class 0x15 / team, 0x7D4
  if (!team) return -1;
  task.teamSnapshot.set(team.slice(0, SNAPSHOT_WORDS));
  if (task.teamSnapshot[0]) return 0;
  const root = h.queryRoot();                                                       // class 0x14 / 0, 0x7D2
  if (root) task.rootSnapshot.set(root.slice(0, SNAPSHOT_WORDS));
  const worm = h.queryWorm(task.team, current);                                     // class 2 / team*16+worm, 0x7D3
  if (!worm) return -1;
  task.wormSnapshot.set(worm.slice(0, SNAPSHOT_WORDS));
  [task.targetTeam, task.targetWorm] = h.wormTarget(task.team, current);            // 004C3230
  const status = task.wormSnapshot[2];
  if (status === 0x64) return -1;
  if (task.delay > 0) { task.delay--; return 0; }
  const state = task.state;
  switch (state) {
    case 0x64:
      if (task.retries > 5) aiTaskSetState(task, 0x7e);
      else { task.plan[6] = 0; task.plannedWorm = 0; task.firstWorm = 0; aiTaskSetState(task, 0x7b); }
      return 1;
    case 0x65: return -1;
    case 0x66: {
      const ws = h.wormState();
      if (ws >= 0x65 && ws <= 0x67 && !(yield* call(h.walkStep())) && (yield* call(h.walkPlan())))
        yield* call(h.walkStep());                                                  // 004CFF20 / 004CFD20
      return 1;
    }
    case 0x6b:
      task.action = 0;
      if (status === 0x65) aiTaskSetState(task, task.nextState);
      return 1;
    case 0x7b: yield* planState(task); return 1;
    case 0x7c: task.action = 0x6f; aiTaskSetState(task, task.nextState); return 1;
    case 0x7d: yield* executeState(task); return 1;
    case 0x7e: task.action = 100; aiTaskSetState(task, 0x65); return 1;
    default:
      if (AI_EXECUTE_ROUTINES[state]) yield* call(h.execute(state, task));
      return 1;
  }
}

// 004D0760: one think step. Returns 0 to end the coroutine.
export function* aiThink(task) {
  const result = yield* aiDispatch(task);
  if (result === -1) return 0;
  if (result === 0) return 1;
  const current = task.host.currentWorm(task.team);
  if (!current) return 1;
  for (const [event, words] of aiActionEvents(task, current)) task.events.push([event, words]);
  task.action = 0;
  return 1;
}

// 004D0C60
function* aiBody(task) {
  for (;;) {
    task.running = 1;
    const result = yield* aiThink(task);
    yield "frame";
    task.running = 0;
    if (!result) return;
  }
}

// One frame event 0x3EA (004D0C30). host callbacks:
//   currentWorm(team), queryTeam(team) -> words|null, queryRoot() -> words|null,
//   queryWorm(team, worm) -> words|null, wormTarget(team, worm) -> [team, worm],
//   wormState(), wormPosition() -> [x, y], wormThink() (message 0x402),
//   execute(state, task), walkStep(), walkPlan(), hazard(), floodFill(x, y),
//   fleeSearch(task) -> index, itemDistance(x, y, radius) -> null|distance,
//   teleportSearch() -> null|[x, y], shotSearch(plan), settling(), water() -> [level, rise],
//   logicRandom(), wormAbove().
// Returns { events: [[event, words]], running, finished, destroyed }.
// `running` mirrors +0x2DD0 (the AI's share of scene+0x1D428) after the frame.
export function aiTaskStep(task, host) {
  task.events = [];
  if (task.coroutine === "destroyed") return { events: [], running: 0, finished: true, destroyed: true };
  if (task.coroutine === "finished") {
    task.coroutine = "destroyed";
    return { events: [], running: 0, finished: true, destroyed: true };
  }
  task.host = host;
  if (!task.body) task.body = aiBody(task);
  task.coroutine = "suspended";
  let step;
  do step = task.body.next(); while (!step.done && step.value !== "frame");
  if (step.done) task.coroutine = "finished";
  return { events: task.events, running: task.running, finished: task.coroutine === "finished", destroyed: false };
}

// 004CD120 (deactivation 0x41F or the post-finish frame): returns 1 when the
// host must decrement scene+0x1D428 (task destroyed while parked mid-coroutine).
export function aiTaskDestroy(task) {
  const parked = task.running;
  task.running = 0; task.coroutine = "destroyed"; task.body = null;
  return parked;
}
