// Movement and safety layer of the original CPU-team AI (WA 3.0.0.0, task
// vtable 00526958). All coordinates are signed 16.16 with native y pointing
// down unless a parameter says "pixels". Verified against the unchanged
// executable by tools/armageddon/cpu-ai-movement-oracle.py.
//
// Host interfaces (the original reaches them through virtual calls):
//   collide(x, y)  scene+0x7D4 vtable+0xC(worm body, x, y): nonzero when the
//                  worm body placed at (x, y) overlaps terrain or another body.
//                  The worm methods 004D1230 (+0xFC), 004D1260 (+0x100,
//                  teleport) and 004F4D80 (+0x11C, walk) all use it. During a
//                  fill the AI clears worm flag bits 0x1800 (vtable+0x74/+0x78).
//   gravity()      scene+0x7D4 vtable+0x24 (16.16 per frame^2).
//   water          scene+0x804, water line in pixels.
//   pixel(x, y)    landscape scene+0x24 vtable+0x28, solid pixel test (pixels).
//   flames         scene+0x4B0 (200 slots) objects, position at +0x4C/+0x50.
//   mines          scene+0x450 (24 slots): {x, y, inactive} where inactive is
//                  the mine's answer to message 0x7D5.
//   moving()       worm vtable+0xF4 (004D11E0): any of +0x9C/+0xA0/+0xBC/+0xC0/+0xC4.
//   yield()        AI vtable+0x28 = coroutine yield 004F0D40.
import { nativeWalkPosition } from "./walking-motion.js";
import { fixedMultiply } from "./numeric.js";
import { nativeSin, nativeCos } from "./trig.js";

const abs = (v) => ((v ^ (v >> 31)) - (v >> 31)) | 0;
const s16 = (v) => (v << 16) >> 16;
const div = (a, b) => Math.trunc((a | 0) / (b | 0)) | 0;
const clamp = (v, lo, hi) => (v > lo ? (v < hi ? v : hi) : lo); // 0049BF90

export const AI_PATH_BUFFER_SIZE = 0x2000; // AI+0xF0
export const AI_REACHABLE_LIMIT = 0x80;    // AI+0x20F0 / AI+0x24F4, 8-byte [int16 x, int16 y, int32 path]
// Move actions stored in paths (the same codes the AI turns into controller
// events in 004D0760): +-1 walk, +-2 forward jump, +-3 backflip toward the
// sign's direction, 4 drop off a ledge, 0 end of path.
export const AI_MOVE = { WALK: 1, JUMP: 2, BACKFLIP: 3, DROP: 4, END: 0 };

// 004C7C00 (mines, radius r) and the flame loops: proximity in Manhattan pixels.
function flameHazard(flames, x, y) {
  let sum = 0;
  for (const [fx, fy] of flames) {
    const d = (abs((x - fx) >> 16) + abs((y - fy) >> 16)) | 0;
    if (d < 0x24) sum = (sum - d + 0x24) | 0;
  }
  return sum;
}
function mineHazard(mines, x, y, r) {
  let sum = 0;
  for (const mine of mines) {
    if (mine.inactive) continue;
    const d = (abs((x - mine.x) >> 16) + abs((y - mine.y) >> 16)) | 0;
    if (r > d) sum = (sum - d + r) | 0;
  }
  return sum;
}
// 004C8920 drop height: pixels fallen before the fall speed reaches 8 px/frame.
export function aiDropHeight(gravity) {
  let fallen = 0, speed = 0;
  if (gravity < 0x80000) do { fallen = (fallen + speed) | 0; speed = (speed + gravity) | 0; } while (((speed + gravity) | 0) < 0x80000);
  return fallen >> 16;
}

// Pathfinder object at scene+0x7D8 (0x4A58 bytes). `scratch` is its 0x400-byte
// path staging area at +0x4644; it persists between fills and supplies the
// (never read) padding bytes of each stored path.
export const createAiPathfinder = () => ({ scratch: new Uint8Array(0x400) });

// 004C8920: flood fill of the positions the worm can reach from (x, y).
// input: {x, y, buffer (Uint8Array), used (bytes already in buffer), capacity,
// limit (spot count), skipFill (AI byte +0x2CA2), pathfinder}. host: collide,
// gravity, water, flames [[x, y]], mines, moving, state (worm vtable+0x7C),
// yield. Returns {result, spots: [[x, y, path]], used, aborted}; used is null
// when the routine returns before storing it.
export function aiReachableSpots(input, host) {
  const { x: startX, y: startY, buffer, capacity = AI_PATH_BUFFER_SIZE, limit = AI_REACHABLE_LIMIT, skipFill = 0 } = input;
  const pathfinder = input.pathfinder ?? createAiPathfinder();
  const scratch = pathfinder.scratch;
  let used = input.used | 0;
  const spots = [];
  if (host.moving()) return { result: 0, spots, used: null, aborted: 0 };
  const wormState = host.state();
  if (wormState !== 0x65 && wormState !== 0x67) return { result: 0, spots, used: null, aborted: 0 };
  if (!host.collide(startX, (startY + 0x10000) | 0)) return { result: 0, spots, used: null, aborted: 0 };
  const collide = (x, y) => host.collide(x | 0, y | 0);
  const moves = [], visited = [];
  let depth = 0, aborted = 0, blocked = 0, unwound = 0, hazardTick = 0, recordTick = 0, yieldTick = 0;
  const dropHeight = aiDropHeight(host.gravity());
  const water = host.water | 0;
  const hazard = (x, y) => (flameHazard(host.flames, x, y) + mineHazard(host.mines, x, y, 0x38)) | 0;
  const tick = () => {
    if (--yieldTick > 0) return;
    yieldTick = 0x28;
    host.yield();
    if (host.moving()) aborted = 1;
  };
  const pushMove = (x, y, action) => { moves[depth++] = [s16(x), s16(y), s16(action)]; };
  const walk = (x, y, dx) => nativeWalkPosition(x, y, dx, 8, collide);
  // 004C7620: three walk steps each way stay supported within 4 pixels.
  const flat = (x, y) => {
    for (const dx of [-0x10000, 0x10000]) {
      let px = x, py = y;
      for (let i = 0; i < 3; i++) {
        const step = walk(px, py, dx);
        px = step.x; py = step.y;
        if (step.result !== 1 || abs((py - y) | 0) > 0x40000) return 0;
      }
    }
    return 1;
  };
  // 004C7710: store the spot and its compressed move stack.
  const record = (px, py) => {
    if (spots.length >= limit) return 0;
    let n = 0, kept = -1, distance = 0;
    for (let i = 0; i < depth; i++) {
      if ((0x400 - n) >>> 0 < 0x10) return 0;
      const move = moves[i];
      if (kept >= 0) distance = (abs(move[1] - moves[kept][1]) + abs(move[0] - moves[kept][0])) | 0;
      if (i && move[2] === moves[i - 1][2] && distance < 0x10) continue;
      kept = i;
      scratch[n++] = move[0] & 0xff; scratch[n++] = (move[0] >> 8) & 0xff;
      scratch[n++] = move[1] & 0xff; scratch[n++] = (move[1] >> 8) & 0xff; scratch[n++] = move[2] & 0xff;
    }
    scratch[n] = px & 0xff; scratch[n + 1] = (px >> 8) & 0xff; scratch[n + 2] = py & 0xff; scratch[n + 3] = (py >> 8) & 0xff;
    scratch[n + 4] = 0;
    const size = (n + 8) & ~3;
    if (((used + size) | 0) > capacity) { used = capacity; return 0; }
    buffer.set(scratch.subarray(0, size), used);
    spots.push([s16(px), s16(py), used]);
    used = (used + size) | 0;
    return 1;
  };
  // 004C7CF0: simulate a jump from pixel (x, y) and continue from the landing spot.
  const jump = (x, y, vx, vy, dir, ceiling) => {
    const gravity = host.gravity();
    const x16 = x << 16, y16 = y << 16;
    let lastY = y16, lastPx = x, lastPy = y;
    tick();
    for (let t = 0x10000; ;) {
      const next = (t + 0x10000) | 0;
      const nx = (fixedMultiply(vx, t) + x16) | 0;
      const ny = (div(fixedMultiply(gravity, fixedMultiply(next, t)), 2) + fixedMultiply(vy, t) + y16) | 0;
      const dy = (ny - lastY) | 0;
      lastY = ny;
      if ((nx >> 16) !== lastPx || (ny >> 16) !== lastPy) if (collide(nx, ny)) return;
      lastPx = nx >> 16; lastPy = ny >> 16;
      if (dy >= 0x10000) {
        if (dy >= 0x80000) return;
        if (collide(nx, ny + 0x20000)) {
          let ly = ny;
          if (!collide(nx, ly + 0x10000)) { let probe; do { probe = (ly + 0x20000) | 0; ly = (ly + 0x10000) | 0; } while (!collide(nx, probe)); }
          for (const [vxp, vyp] of visited) if (vxp === nx >> 16 && vyp === ly >> 16) return;
          const level = (flameHazard(host.flames, nx, ly) + mineHazard(host.mines, nx, ly, 0x38)) | 0;
          if (level > ceiling || !flat(nx, ly)) return;
          fill(nx, ly, dir, level); fill(nx, ly, -dir, level);
          return;
        }
      }
      t = next;
      if (t >= 0x400000) return;
    }
  };
  const launch = (angle, dir) => [Math.imul(fixedMultiply(nativeCos(angle), 0x48000), dir), -fixedMultiply(nativeSin(angle), 0x48000) | 0];
  // 004C8100: walk one pixel at a time in `dir` while the hazard level does not rise.
  function fill(x, y, dir, ceiling) {
    unwound = 0;
    tick();
    if (aborted || spots.length >= limit || capacity <= used) return;
    if (((water - 0x10) | 0) <= y >> 16) return;
    if (!collide(x, y + 0x10000)) { aborted = 1; return; }
    if (visited.length >= 0x1000 || depth >= 0x100) return;
    // The original compares the stored pixel words against the 16.16 arguments here.
    for (const [vx, vy] of visited) if (vx === x && vy === y) return;
    if (++recordTick >= 0x10) { recordTick = 0; record(x >> 16, y >> 16); }
    visited.push([s16(x >> 16), s16(y >> 16)]);
    pushMove(x >> 16, y >> 16, dir);
    const step = walk(x, y, dir << 16);
    x = step.x; y = step.y;
    if (step.result === -1) {
      let fall = 0;
      while (fall < dropHeight) {
        const below = fall + 1;
        if (collide(x, y + (below << 16))) break;
        fall = below;
        if (++hazardTick >= 4) {
          hazardTick = 0;
          if (hazard(x, (y + (fall << 16)) | 0) > ceiling) fall = dropHeight;
        }
      }
      blocked = 0;
      if (fall < dropHeight && !visited.some(([vx, vy]) => vx === x >> 16 && ((vy - (y >> 16)) | 0) === fall)) {
        pushMove(x >> 16, y >> 16, AI_MOVE.DROP);
        fill(x, (y + (fall << 16)) | 0, dir, ceiling); blocked = 0;
        fill(x, (y + (fall << 16)) | 0, -dir, ceiling); blocked = 0;
        depth--;
      }
    } else if (step.result === 0) blocked = 0x10;
    else if (step.result === 1) {
      blocked = 0;
      let level = ceiling;
      if (++hazardTick >= 4) { hazardTick = 0; level = hazard(x, y); }
      if (level <= ceiling) fill(x, y, dir, level); else blocked = 8;
    }
    depth--;
    // Unwinding from a wall (16 frames) or a hazard (8 frames): try four jumps here.
    if (!blocked || blocked > ++unwound) return;
    if (!flat(x, y)) return;
    const px = x >> 16, py = y >> 16;
    const tries = [[2 * dir, 0x2aaa, dir], [3 * dir, 0x38e3, dir], [-2 * dir, 0x2aaa, -dir], [-3 * dir, 0x38e3, -dir]];
    for (const [action, angle, side] of tries) {
      blocked = unwound = 0;
      pushMove(px, py, action);
      const [vx, vy] = launch(angle, side);
      jump(px, py, vx, vy, side, ceiling);
      depth--;
    }
    blocked = unwound = 0;
  }
  record(startX >> 16, startY >> 16);
  const start = (flameHazard(host.flames, startX, startY) + mineHazard(host.mines, startX, startY, 0x38)) | 0;
  if (!skipFill) { fill(startX, startY, 1, start); fill(startX, startY, -1, start); }
  return { result: aborted ? 0 : spots.length, spots, used, aborted, dropHeight };
}

// 004CE690 (which 1: list AI+0x20F0, buffer restarted) / 004CE730 (which 2:
// list AI+0x24F4, appended after the first list's paths without moving
// AI+0x28F4). ai: {buffer, used, spots1, spots2, skipFill, pathfinder}.
// host adds wormFlags()/setWormFlags(v). Returns 1 when any spot was found.
export function aiBuildReachable(ai, x, y, which, host) {
  const flags = host.wormFlags();
  host.setWormFlags(flags & ~0x1800);
  if (which === 1) { ai.used = 0; ai.spots2 = []; }
  const result = aiReachableSpots({ x, y, buffer: ai.buffer, used: ai.used, skipFill: ai.skipFill,
    pathfinder: ai.pathfinder ??= createAiPathfinder() }, host);
  if (which === 1) { if (result.used !== null) ai.used = result.used; ai.spots1 = result.result > 0 ? result.spots : []; }
  else ai.spots2 = result.result > 0 ? result.spots : [];
  ai[which === 1 ? "count1" : "count2"] = result.result;
  host.setWormFlags(flags);
  return result.result > 0 ? 1 : 0;
}

// Path records: 5-byte steps [int16 x, int16 y, int8 action] from the start
// spot, ending with the destination and action 0.
export function aiDecodePath(buffer, offset) {
  const steps = [];
  for (;;) {
    const x = s16(buffer[offset] | (buffer[offset + 1] << 8)), y = s16(buffer[offset + 2] | (buffer[offset + 3] << 8));
    const action = (buffer[offset + 4] << 24) >> 24;
    steps.push([x, y, action]);
    if (!action) return steps;
    offset += 5;
  }
}

// 004CD350.
function setState(ai, state) {
  ai.replanned = 0; ai.delay = 10;
  if (state === 0x69) ai.field2930 = 0;
  ai.state = state;
}
// 004D0170: follow the path of spot [x, y, path] (state 0x66) and continue
// with nextState, or switch straight to nextState when already there.
export function aiPathStart(ai, spot, nextState) {
  if (!ai.buffer[(spot[2] + 4) | 0]) { setState(ai, nextState); return 0; }
  setState(ai, 0x66);
  ai.nextState = nextState; ai.target = [...spot]; ai.cursor = spot[2];
  ai.step = 0; ai.stall = 0; ai.toX = spot[0]; ai.toY = spot[1];
  return 1;
}
const fail = (ai) => { setState(ai, 100); ai.failures = (ai.failures + 1) | 0; };
const word = (buffer, at) => s16(buffer[at] | (buffer[at + 1] << 8));
// 004CFD20: load the next path step. host.teleport(x, y) is worm vtable+0x100.
export function aiPathAdvance(ai, host) {
  if (ai.step) return 1;
  ai.stall = 0;
  const at = ai.cursor;
  const action = (ai.buffer[at + 4] << 24) >> 24;
  ai.step = action;
  if (!action) {
    if (!host.teleport(ai.toX << 16, ai.toY << 16)) { fail(ai); return 0; }
    setState(ai, ai.nextState); ai.failures = 0;
    return 0;
  }
  ai.fromX = word(ai.buffer, at); ai.fromY = word(ai.buffer, at + 2);
  ai.cursor = (at + 5) | 0;
  ai.toX = word(ai.buffer, at + 5); ai.toY = word(ai.buffer, at + 7);
  if (action === AI_MOVE.DROP && !host.teleport(ai.fromX << 16, ai.fromY << 16)) { ai.step = 0; fail(ai); return 0; }
  ai.jumpIssued = 0;
  return 1;
}
// 004CFF20: drive the current step with action codes (AI+0xEC). host:
// wormState() (vtable+0x7C), position() -> [x, y]. Returns 1 while the step runs.
export function aiPathExecute(ai, host) {
  const wormState = host.wormState();
  const [x, y] = host.position();
  const distance = (abs(((y >> 16) - ai.toY) | 0) + abs(((x >> 16) - ai.toX) | 0)) | 0;
  const step = ai.step;
  const stalled = () => { if (++ai.stall > 0x32) fail(ai); };
  if (step === 2 || step === -2 || step === 3 || step === -3) {
    if (!ai.jumpIssued) { ai.jumpIssued = 1; ai.action = step; }
    else if (distance > 5) fail(ai);
    else ai.step = 0;
  } else if (step === 1 || step === -1) {
    if (distance > 0x20) fail(ai);
    else if (distance <= 5 && (step < 0 ? ((ai.toX + 3) << 16) >= x : ((ai.toX - 3) << 16) <= x)) ai.step = 0;
    else ai.action = step;
    if (wormState !== 0x66) stalled();
  } else if (step === AI_MOVE.DROP) {
    if (distance > 5 && ++ai.stall > 0x32) fail(ai);
    else ai.step = 0;
  }
  return ai.step ? 1 : 0;
}
// 004D0130: state 0x66 body (think step 004D02C0 clears AI+0xEC first).
export function aiPathStep(ai, host) {
  const wormState = host.wormState();
  if (wormState < 0x65 || wormState > 0x67) return;
  if (!aiPathExecute(ai, host) && aiPathAdvance(ai, host)) aiPathExecute(ai, host);
}

// 004CED90: any solid pixel on the border of the 5x5 square around (x, y) (pixels).
const RING = [[-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1],
  [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2]];
export function aiRingSolid(pixel, x, y) {
  for (const [dx, dy] of RING) if (pixel((x + dx) | 0, (y + dy) | 0)) return 1;
  return 0;
}
// 004CEEC0: one pixel sideways, climbing or settling up to `climb` pixels.
// Returns {result, x, y}: 1 moved, 0 blocked, -1-n fell n pixels further (y kept).
export function aiStepAlong(pixel, water, x, y, dir, climb) {
  const nx = (x + dir) | 0;
  let ny = y;
  if (aiRingSolid(pixel, nx, ny)) {
    for (let i = 0; i < climb; i++) { ny--; if (!aiRingSolid(pixel, nx, ny)) return { result: 1, x: nx, y: ny }; }
    return { result: 0, x, y };
  }
  for (let i = 0; i < climb; i++) {
    if (aiRingSolid(pixel, nx, (ny + 1) | 0)) return { result: 1, x: nx, y: ny };
    ny++;
  }
  ny = y;
  let result = -1;
  while (water >= ny) { ny++; if (aiRingSolid(pixel, nx, ny)) break; result--; }
  return { result, x: nx, y };
}
// 004CEFD0: drowning exposure of sliding from pixel (x, y) toward dir:
// 0 walled in, 0x3333 after 256 dry pixels, 0x3333 + remaining/256 when the
// slide ends in water, 0x13333 when already below the water line.
export function aiDrownExposure(pixel, water, x, y, dir) {
  while (water > y && !aiRingSolid(pixel, x, (y + 1) | 0)) y++;
  if (water <= y) return 0x13333;
  for (let steps = 0; steps < 0x100; steps++) {
    const step = aiStepAlong(pixel, water, x, y, dir, 5);
    x = step.x; y = step.y;
    if (!step.result) return 0;
    if (step.result < 0) {
      y = (y - step.result - 1) | 0;
      if (water <= y) return (((0x100 - steps) << 16) >> 8) + 0x3333;
    }
  }
  return 0x3333;
}
// 004CEA30: safety of spot (x, y) for the AI. tasks: registry order
// [{self, type, x, y, team, worm, inactive (msg 0x7D5), armed (msg 0x7D6)}];
// world: {pixel, water, health(team, worm) (004C2CC0)}. Type 2 worms, 10
// mines, 15 and 17 objects within 256 Manhattan pixels cost safety; height
// above ownY gains 20 per pixel; drowning exposure both ways costs 1/100.
export function aiSpotScore(ai, ownY, x, y, tasks, world) {
  if (!tasks.length) return 0;
  let score = 0;
  for (const task of tasks) {
    if (task.self) continue;
    const near = () => clamp((0x1000000 - ((abs((x - task.x) | 0) + abs((y - task.y) | 0)) | 0)) | 0, 0, 0x1000000);
    if (task.type === 2) {
      let b = near();
      if (!world.health(task.team, task.worm)) score = (score - ((b << 3) >> 16)) | 0;
      else { if (task.team === ai.team) b = (b * 2) | 0; score = (score - (b >> 16)) | 0; }
    } else if (task.type === 10) {
      if (task.inactive) continue;
      let b = near();
      if (task.armed) b = Math.imul(b, 10);
      score = (score - Math.imul(b >> 16, 3)) | 0;
    } else if (task.type === 15) score = (score - Math.imul(near() >> 16, 10)) | 0;
    else if (task.type === 17) score = (score - Math.imul(near() >> 16, 4)) | 0;
  }
  score = (score + Math.imul(((ownY - y) | 0) >> 16, 20)) | 0;
  const left = aiDrownExposure(world.pixel, world.water, x >> 16, y >> 16, -1);
  const right = aiDrownExposure(world.pixel, world.water, x >> 16, y >> 16, 1);
  return (div((left + right) | 0, -100) + score) | 0;
}
// 004CE920: index of the best-scoring spot or -1. flags 1: keep spots on the
// worm's side of x; flags 2: add twice the 16.16 distance from (x, y).
export function aiChooseSpot(ai, spots, x, y, flags, own, tasks, world) {
  const [ownX, ownY] = own;
  let best = -1, found = 0, bestScore = 0;
  for (const [index, [sx, sy]] of spots.entries()) {
    if (flags & 1) {
      if (x > ownX && sx << 16 > x) continue;
      if (x < ownX && sx << 16 < x) continue;
    }
    let score = aiSpotScore(ai, ownY, sx << 16, sy << 16, tasks, world);
    if (flags & 2) score = (score + ((abs(((sy << 16) - y) | 0) + abs(((sx << 16) - x) | 0)) | 0) * 2) | 0;
    if (!found || score > bestScore) { found++; bestScore = score; best = index; }
  }
  return best;
}
// 004CEC90: something is about to explode: a worm at 0 health, a mine with
// a running fuse (message 0x7D6), or any type-15 object.
export function aiImminentExplosion(tasks, world) {
  for (const task of tasks) {
    if (task.self) continue;
    if (task.type === 2 && !world.health(task.team, task.worm)) return 1;
    if (task.type === 10 && task.armed) return 1;
    if (task.type === 15) return 1;
  }
  return 0;
}
// 004CD460 prologue (read from code): flee an imminent explosion to the
// safest reachable spot, then continue with state 100. Returns 1 when handled.
export function aiHazardFlee(ai, host) {
  if (!aiImminentExplosion(host.tasks, host.world)) return 0;
  const [x, y] = host.position();
  if (!aiBuildReachable(ai, x, y, 1, host)) return 0;
  const index = aiChooseSpot(ai, ai.spots1, 0, 0, 0, [x, y], host.tasks, host.world);
  if (index < 0) return 0;
  aiPathStart(ai, ai.spots1[index], 100);
  return 1;
}
// 004F3E50 (state 0x6A): after firing, rebuild the second reachable list and
// walk to the safest spot on the worm's side of the planned impact (plan
// +0x3C/+0x40 at AI+0x2994/+0x2998), preferring distance from it.
export function aiRetreatStep(ai, host) {
  const wormState = host.wormState();
  if (wormState < 0x65 || wormState > 0x67) return;
  const [x, y] = host.position();
  if (!aiBuildReachable(ai, x, y, 2, host)) { setState(ai, 100); return; }
  const index = aiChooseSpot(ai, ai.spots2, ai.impactX, ai.impactY, 3, [x, y], host.tasks, host.world);
  if (index < 0) { setState(ai, 100); return; }
  aiPathStart(ai, ai.spots2[index], 100);
}
