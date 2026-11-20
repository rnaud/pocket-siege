// Original CPU-team AI (WA 3.0.0.0, task vtable 00526958): the weapon-family
// evaluators other than the ballistic one, their execution states, the escape
// walk chooser, the teleport search and the weapon-group order 004CE3A0.
// All coordinates are 16.16 fixed point, native y-down, unless noted as pixels.
//
// Families (plan word 6) and the states 004CDC10 starts them with:
//   1 drop     004F1FC0  dynamite 0x15, mine 0x16, Ming vase 0x31     states 0x6F..0x71
//   2 gun      004F2D50  shotgun 0xB, handgun 0xC, uzi 0xD, minigun 0xE  states 0x6C..0x6E
//   3 ballistic 004F3F00 (cpu-ai.js)                                states 0x67..0x6A
//   4 strike   004F1A50  air 0x1B, napalm 0x1C, mail 0x1D, MB bomb 0x2E,
//                        sheep strike 0x32, carpet 0x33, donkey 0x36  states 0x72..0x74
//   5 melee    004F2470  fire punch 0x10 only (dragon ball 0x11, kamikaze 0x12,
//                        prod 0x14 and bat 0x23 dispatch here but return 0)  states 0x78..0x7A
// Teleport (slot 0x28) is not a plan family: 004F10A0 picks a destination and
// 004F0E40 starts states 0x75..0x77.
//
// Shared host interface (each field names the original call it replaces):
//   tasks()            task registry (scene+0x7D4 vtable+0x48/+0x4C) in order:
//                      {type (vt+0x50), x, y (vt+0x5C), team, worm, snapshot
//                      (msg 0x7D3 succeeded), msg5/msg6 (msgs 0x7D5/0x7D6), self}
//   ownPosition()      own worm vt+0x5C -> [x, y]
//   teleport(x, y)     own worm vt+0x100 -> bool; wormFlags()/setWormFlags(v) vt+0x74/+0x78
//   yield()            coroutine yield 004F0D40 (AI vtable+0x28)
//   solid(x, y)        AI+0x2DC8 landscape vtable+0x54 (pixels)
//   blocked(x, y)      scene+0x24 landscape vtable+0x28 (pixels, worm crawl test)
//   collides(m, x, y, f) scene+0x7D4 vtable+0x8 object query (16.16)
//   water              scene+0x804 (pixels); wind()/gravity() scene+0x7D4 vtable+0x28/+0x24
//   ammo(weapon)       004C2EE0 (-1 infinite)
//   estimate(x, y, r, d, exclude) 004CF130 with the current own position -> [enemy, friendly]
//   positions          reachable positions AI+0x20F0: [[x, y, path], ...] (pixels)
//   pathfind(x, y)     004C8920 from (x, y) -> escape rows [[x, y, path]] (pixels)
//   routeByte(path)    byte AI+0xF4+path (nonzero: a walk is needed)
//   world              {health, alliance, ally, double, rangeWord} as in aiBlastEstimate
import { fixedMultiply, fixedDivide } from "./numeric.js";
import { nativeSin, nativeCos } from "./trig.js";
import { nativeDirectionTurn } from "./direction.js";
import { nativeVectorLength } from "./blast-damage.js";
import {
  nextAiRandom, aiSetState, aiComparePlans, aiWeaponBlast, aiWeaponTrial, aiEvaluateWeapon, AI_WEAPON_GROUPS,
} from "./cpu-ai.js";

const abs = (v) => ((v ^ (v >> 31)) - (v >> 31)) | 0;
const div = (a, b) => (Math.trunc((a | 0) / (b | 0)) | 0);
const clamp = (v, lo, hi) => (v > lo ? (v < hi ? v : hi) : lo); // 0049BF90
const quantizeAim = (v) => div(Math.imul(v & 0xfffffe00, 0x80), 0x80);
const idle = (state) => state >= 0x65 && state <= 0x67;
// 0049BF50: length, and the vector normalized in place.
function normalize(x, y) {
  const length = nativeVectorLength(x, y);
  return length ? [length, fixedDivide(x, length), fixedDivide(y, length)] : [0, x, y];
}
// 004F32D0-style nine-point square (the left middle point twice, the right middle never).
function squareHit(solid, x, y, r) {
  for (const [px, py] of [[x - r, y - r], [x, y - r], [x + r, y - r], [x - r, y], [x, y], [x - r, y],
    [x - r, y + r], [x, y + r], [x + r, y + r]]) if (solid(px | 0, py | 0)) return 1;
  return 0;
}
function restore(host, ox, oy) {
  const flags = host.wormFlags();
  host.setWormFlags(2); host.teleport(ox, oy); host.setWormFlags(flags);
}
const enemiesOf = (ai, host) => host.tasks().filter((t) => t.type === 2 && t.snapshot && t.team !== ai.team);
const entryAt = (rows, index) => rows[index] ?? [0, 0, 0]; // the original reads past the count

// ------------------------------------------------------------------ escape walks
// 004CED90: sixteen-point ring of a 5x5 square around (x, y) (pixels).
function crawlBlocked(blocked, x, y) {
  for (const [px, py] of [[x - 2, y - 2], [x - 1, y - 2], [x, y - 2], [x + 1, y - 2], [x + 2, y - 2], [x - 2, y - 1],
    [x + 2, y - 1], [x - 2, y], [x + 2, y], [x - 2, y + 1], [x + 2, y + 1], [x - 2, y + 2], [x - 1, y + 2], [x, y + 2],
    [x + 1, y + 2], [x + 2, y + 2]]) if (blocked(px, py)) return 1;
  return 0;
}
// 004CEEC0: one crawl step of `direction` pixels, climbing or stepping down at
// most `climb`; returns 1 (moved), 0 (wall) or -1-k (fell k pixels, y unchanged).
function crawlStep(blocked, water, pos, direction, climb) {
  const x = (pos.x + direction) | 0;
  let y = pos.y;
  if (crawlBlocked(blocked, x, y)) {
    for (let i = 0; i < climb; i++) { y--; if (!crawlBlocked(blocked, x, y)) { pos.x = x; pos.y = y; return 1; } }
    return 0;
  }
  for (let i = 0; i < climb; i++) {
    if (crawlBlocked(blocked, x, (y + 1) | 0)) { pos.x = x; pos.y = y; return 1; }
    y++;
  }
  let result = -1;
  y = pos.y;
  while (water >= y) { y++; if (crawlBlocked(blocked, x, y)) break; result--; }
  pos.x = x;
  return result;
}
// 004CEFD0: how quickly crawling from (x, y) (pixels) in `direction` reaches
// the water: 0x13333 already in water, 0 blocked, 0x3333 not within 256 steps,
// else 0x3333 + (256 - steps) * 256.
export function aiWaterEscape(host, x, y, direction) {
  const { blocked, water } = host;
  while (water > y && !crawlBlocked(blocked, x, (y + 1) | 0)) y++;
  if (water <= y) return 0x13333;
  const pos = { x, y };
  for (let steps = 0; steps < 0x100; steps++) {
    const r = crawlStep(blocked, water, pos, direction, 5);
    if (!r) return 0;
    if (r < 0) {
      pos.y = (pos.y - (r + 1)) | 0;
      if (water <= pos.y) return (div((0x100 - steps) << 16, 0x100) + 0x3333) | 0;
    }
  }
  return 0x3333;
}
// 004CEA30: danger of standing at (ex, ey) (the first own-x argument is unused).
export function aiEscapeScore(ai, host, oy, ex, ey) {
  const tasks = host.tasks();
  if (!tasks.length) return 0;
  let score = 0;
  for (const t of tasks) {
    if (t.self) continue;
    const near = clamp((0x1000000 - ((abs((ex - t.x) | 0) + abs((ey - t.y) | 0)) | 0)) | 0, 0, 0x1000000);
    if (t.type === 2) {
      if (!host.world.health(t.team, t.worm)) score -= (near << 3) >> 16;
      else score -= (t.team === ai.team ? near * 2 : near) >> 16;
    } else if (t.type === 10) {
      if (t.msg5) continue;
      score -= Math.imul((t.msg6 ? near * 10 : near) >> 16, 3);
    } else if (t.type === 15) score -= Math.imul(near >> 16, 10);
    else if (t.type === 17) score -= Math.imul(near >> 16, 4);
    score |= 0;
  }
  score = (score + Math.imul((oy - ey) >> 16, 20)) | 0;
  const left = aiWaterEscape(host, ex >> 16, ey >> 16, -1), right = aiWaterEscape(host, ex >> 16, ey >> 16, 1);
  return (div((left + right) | 0, -100) + score) | 0;
}
// 004CE920: best escape row for a danger at (x, y). mode bit 1 keeps rows on
// the own side of x, bit 2 adds twice the distance from (x, y). -1 when none.
export function aiChooseEscape(ai, host, rows, x, y, mode) {
  const [ox, oy] = host.ownPosition();
  let best = -1, bestScore = 0, found = 0;
  for (let i = 0; i < rows.length; i++) {
    const ex = rows[i][0] << 16, ey = rows[i][1] << 16;
    if (mode & 1) {
      if (x > ox && ex > x) continue;
      if (x < ox && ex < x) continue;
    }
    let score = aiEscapeScore(ai, host, oy, ex, ey);
    if (mode & 2) score = (score + 2 * ((abs((ey - y) | 0) + abs((ex - x) | 0)) | 0)) | 0;
    if (found && score <= bestScore) continue;
    found++; bestScore = score; best = i;
  }
  return best;
}
// 004CE730: recompute the escape rows (AI+0x24F4, at most 0x80) from (x, y)
// with the own worm's 0x1800 flags cleared. Returns 1 when any exist.
export function aiRefreshEscapes(ai, host, x, y) {
  const flags = host.wormFlags();
  host.setWormFlags(flags & 0xffffe7ff);
  ai.escapes = host.pathfind(x, y).slice(0, 0x80);
  host.setWormFlags(flags);
  return ai.escapes.length > 0 ? 1 : 0;
}
// 004D0170: walk to a reachable row, then enter `state`. Returns 1 when a walk
// (state 0x66 with target AI+0x2904..) was started.
export function aiGoThen(ai, state, entry, host) {
  ai.replanned = 0; ai.delay = 10;
  if (!host.routeByte(entry[2])) {
    if (state === 0x69) ai.field2930 = 0;
    ai.state = state;
    return 0;
  }
  ai.state = 0x66; ai.nextState = state;
  ai.walk = { x: entry[0], y: entry[1], path: entry[2] };
  return 1;
}
// 004CDC10 after the plan is chosen: family -> first execution state.
export function aiStartPlan(ai, plan, host) {
  const rows = host.positions;
  switch (plan[6]) {
    case 0: aiSetState(ai, 0x64); return;
    case 1: aiGoThen(ai, 0x6f, entryAt(rows, plan[14]), host); return;
    case 2: aiGoThen(ai, 0x6c, entryAt(rows, plan[18]), host); return;
    case 3: aiGoThen(ai, 0x67, entryAt(rows, plan[23]), host); return;
    case 4: aiGoThen(ai, 0x72, entryAt(rows, plan[18]), host); return;
    case 5: aiGoThen(ai, 0x78, entryAt(rows, plan[15]), host); return;
    default:
  }
}
// After a shot: refresh escapes from the own position and walk to the best one.
function escapeWalk(ai, host, x, y, mode) {
  const [ox, oy] = host.ownPosition();
  if (!aiRefreshEscapes(ai, host, ox, oy)) { aiSetState(ai, 0x64); return; }
  const index = aiChooseEscape(ai, host, ai.escapes, x, y, mode);
  if (index < 0) aiSetState(ai, 0x64);
  else aiGoThen(ai, 0x64, ai.escapes[index], host);
}

// ------------------------------------------------------------------ gun (family 2)
// 004F29D0: aim at (tx, ty) from (x0, y0), march the ray in 1-pixel steps up to
// the record range (+0xA0 pixels) against terrain (r = 3) and score the impact.
// Plan words: 7 radius, 8 damage, 9 ray length, 10/11 launch, 12/13 target,
// 14/15 impact, 16 aim, 17 facing, 18 = -1.
export function aiGunShot({ weapon, record = 0, range, x0, y0, tx, ty, radius, damage }, host) {
  const [, nx, ny] = normalize((tx - x0) | 0, (ty - y0) | 0);
  let turn = nativeDirectionTurn(nx, -ny | 0) & 0xffff, facing; // 0049C030 leaves a 16-bit turn in eax
  if (turn >= 0x8000) { facing = -1; turn = (turn * 2 - 0x10000) | 0; } else { facing = 1; turn = ((0x8000 - turn) * 2) | 0; }
  const aim = clamp(quantizeAim(turn), 0, 0x10000);
  const angle = div(facing < 0 ? (0x20000 - aim) | 0 : aim, 2);
  const [length, sx, sy] = normalize(nativeSin(angle), nativeCos(angle));
  const limit = range << 16;
  if (limit < length) return null;
  let t = 0, ix = 0, iy = 0;
  for (; t <= limit; t = (t + 0x10000) | 0) {
    ix = ((x0 + fixedMultiply(sx, t)) | 0) >> 16; iy = ((y0 + fixedMultiply(sy, t)) | 0) >> 16;
    if (squareHit(host.solid, ix, iy, 3)) break;
  }
  if (t <= 0) return null;
  const [enemy, friendly] = host.estimate(ix << 16, iy << 16, radius, damage, 0);
  return { 1: weapon, 2: record, 3: enemy, 4: friendly, 6: 2, 7: radius, 8: damage, 9: t, 10: x0, 11: y0, 12: tx, 13: ty,
    14: ix << 16, 15: iy << 16, 16: aim, 17: facing, 18: -1 };
}
// 004F2D50: every enemy (aimed 4 pixels below its position) from every
// reachable position (own worm teleported there). record: range (+0xA0),
// pellets (+0x94), damage (+0x80). Word 18 = position index.
export function aiGunEvaluate(ai, plan, weapon, record, host) {
  plan[6] = 0;
  const positions = host.positions;
  if (!positions.length || !host.ammo(weapon)) return 0;
  const radius = (record.pellets * 2 + 8) | 0, damage = Math.imul(record.damage, record.pellets);
  let found = 0;
  for (const enemy of enemiesOf(ai, host)) {
    const tx = enemy.x, ty = (enemy.y + 0x40000) | 0;
    host.yield();
    for (let index = 0; index < positions.length; index++) {
      const [ox, oy] = host.ownPosition();
      const [px, py] = positions[index];
      if (!host.teleport(px << 16, py << 16)) continue;
      const shot = aiGunShot({ weapon, record: record.address ?? 0, range: record.range, x0: px << 16, y0: py << 16,
        tx, ty, radius, damage }, host);
      if (shot) {
        const candidate = toPlan(shot);
        if (!found || aiComparePlans(plan, candidate, ai.skill) < 0) { copyPlan(plan, candidate); plan[18] = index; }
        found++;
      }
      restore(host, ox, oy);
    }
  }
  return found ? 1 : 0;
}
// 004F2900 (state 0x6E): after the trigger, replan while the turn allows more
// shots (team snapshot +0xC), else walk to the escape farthest from danger
// around the impact (words 14/15, mode 3).
export function aiGunAfterShot(ai, plan, { wormState, canAttack }, host) {
  if (!idle(wormState)) return;
  if (canAttack) { aiSetState(ai, 0x64); return; }
  escapeWalk(ai, host, plan[14], plan[15], 3);
}

// ------------------------------------------------------------------ melee (family 5)
// 004CF4B0: worms in the box [px+x1, px+x2] x [py+y1, py+y2] (offsets in pixels)
// take `damage`, doubled when the hit pushes them towards the side where
// crawling reaches water sooner. Returns [enemy, friendly].
export function aiMeleeEstimate(ai, host, exclude, px, py, x1, y1, x2, y2, damage, direction) {
  const [ox, oy] = host.ownPosition();
  const w = host.world;
  let enemy = 0, friendly = 0;
  const tasks = host.tasks();
  if (!tasks.length) return [0, 0];
  const l = (px + (x1 << 16)) | 0, t = (py + (y1 << 16)) | 0, r = (px + (x2 << 16)) | 0, b = (py + (y2 << 16)) | 0;
  for (const task of tasks) {
    if (task.type !== 2 || (exclude && task.self) || !task.snapshot) continue;
    if (l > task.x || t > task.y || r < task.x || b < task.y) continue;
    let hurt = damage;
    const left = aiWaterEscape(host, task.x >> 16, task.y >> 16, -1), right = aiWaterEscape(host, task.x >> 16, task.y >> 16, 1);
    const delta = (right - left) | 0, side = delta < 0 ? -1 : delta > 0 ? 1 : 0;
    if (side === (direction < 0 ? -1 : direction > 0 ? 1 : 0)) hurt = (damage * 2) | 0;
    let kind = w.alliance(task.team) === w.alliance(ai.team) ? 2 : 0;
    if (!kind && w.ally(task.team)) kind += 4;
    if (!kind && w.rangeWord && ((abs((oy - task.y) | 0) + abs((ox - task.x) | 0)) >> 16) > w.rangeWord) kind += 4;
    if (kind) { friendly = (friendly + Math.imul(kind + 1, hurt)) | 0; continue; }
    if (task.team === ai.targetTeam) hurt = task.worm === ai.targetWorm ? Math.imul(hurt, 3) : Math.imul(hurt, 2);
    if (w.double(task.team)) hurt = Math.imul(hurt, 2);
    enemy = (enemy + hurt) | 0;
  }
  return [enemy, div(Math.imul((ai.skill + 0x1e) | 0, friendly), 0x82)];
}
// 004F23D0: one punch plan. Words 7..10 box offsets (x1, y1, x2, y2 pixels),
// 12/13 position, 14 facing, 15 = -1 (word 11 is not written). Returns enemy damage.
export function aiMeleeShot(ai, { weapon, record = 0, px, py, x1, y1, x2, y2, damage, facing }, host) {
  const [enemy, friendly] = aiMeleeEstimate(ai, host, 1, px, py, x1, y1, x2, y2, damage, facing);
  return { 1: weapon, 2: record, 3: enemy, 4: friendly, 6: 5, 7: x1, 8: y1, 9: x2, 10: y2, 12: px, 13: py, 14: facing, 15: -1 };
}
// 004F2470: fire punch only. The box rises by the punch height (record +0x7C
// launch speed against gravity) above the worm. record: damage (+0x70), rise (+0x7C).
// Word 15 = position index. Other slots return 0 without touching the plan.
export function aiMeleeEvaluate(ai, plan, weapon, record, host) {
  const positions = host.positions;
  if (!positions.length || weapon !== 0x10) return 0;
  const fall = -host.gravity() | 0;
  let v = div(Math.imul(record.rise << 17, 3), 100), height = 0;
  while (v > 0) { height = (height + v) | 0; v = (v + fall) | 0; }
  const y1 = (-15 - (height >> 16)) | 0;
  if (!host.ammo(weapon)) return 0;
  let found = 0;
  // The punch box ignores which enemy is being visited: each one repeats the full sweep.
  for (let enemies = enemiesOf(ai, host).length; enemies > 0; enemies--) {
    host.yield();
    for (let index = 0; index < positions.length; index++) {
      const [ox, oy] = host.ownPosition();
      const [px, py] = positions[index];
      if (!host.teleport(px << 16, py << 16)) continue;
      for (let facing = -1; facing <= 1; facing += 2) {
        const shot = aiMeleeShot(ai, { weapon, record: record.address ?? 0, px: px << 16, py: py << 16,
          x1: facing < 0 ? -20 : 0, y1, x2: facing < 0 ? 0 : 20, y2: 15, damage: record.damage, facing }, host);
        if (!shot[3]) continue;
        const candidate = toPlan(shot);
        if (!found || aiComparePlans(plan, candidate, ai.skill) < 0) { copyPlan(plan, candidate); plan[15] = index; }
        found++;
      }
      restore(host, ox, oy);
    }
  }
  return found ? 1 : 0;
}
// 004F2220 (0x78) select, 004F2270 (0x79) face then punch, 004F2310 (0x7A) escape.
export function aiMeleeState(ai, plan, { wormState, selected }, host) {
  if (ai.state === 0x78) {
    if (ai.weapon !== selected) ai.action = 0x6c;
    aiSetState(ai, 0x79);
  } else if (ai.state === 0x79) {
    if (!idle(wormState)) return;
    if (plan[14]) { ai.action = plan[14] >= 0 ? 0x67 : 0x66; plan[14] = 0; return; }
    ai.action = 0x6a; aiSetState(ai, 0x7a);
  } else if (ai.state === 0x7a && idle(wormState)) escapeWalk(ai, host, plan[12], plan[13], 0);
}

// ------------------------------------------------------------------ drop (family 1)
// 004F1BF0: drop at (px, py) next to the enemy at (tx, ty): at most 8 pixels
// below it and 20 pixels Manhattan away. Words 9/10 and 11/12 position, 13
// facing towards the enemy, 14/15 = -1. Scored without the own worm.
export function aiDropShot({ weapon, record = 0, px, py, tx, ty, radius, damage }, host) {
  const distance = (abs((ty - py) | 0) + abs((tx - px) | 0)) | 0;
  if (((py - ty) | 0) > 0x80000 || distance > 0x140000) return null;
  const [enemy, friendly] = host.estimate(px, py, radius, damage, 1);
  return { 1: weapon, 2: record, 3: enemy, 4: friendly, 6: 1, 7: radius, 8: damage, 9: px, 10: py, 11: px, 12: py,
    13: tx > px ? 1 : -1, 14: -1, 15: -1 };
}
// 004F1D50 + 004F1FC0: sampled positions near each enemy (no teleport), then
// the best plan is re-scored from the escape row chosen around the drop
// (004CE920 mode 2) with the own worm moved there. record.kind (+0x70): 1 blast
// from +0x8C, 2 from the +0x74 sub-record (aiWeaponBlast), else no plan.
// Words 14 = position index, 15 = escape index.
export function aiDropEvaluate(ai, plan, weapon, record, host) {
  plan[6] = 0;
  const positions = host.positions;
  if (!positions.length || !host.ammo(weapon)) return 0;
  let radius, damage;
  if (record.kind === 1) { radius = (record.blast * 2 + 0x10) | 0; damage = record.blast; }
  else if (record.kind === 2) [radius, damage] = aiWeaponBlast(record);
  else return 0;
  let found = 0;
  for (const enemy of enemiesOf(ai, host)) {
    const stride = Math.max(1, div(positions.length, 10));
    ai.seed = nextAiRandom(ai.seed);
    for (let index = ((ai.seed >>> 16) % stride) | 0; index < positions.length; index += stride) {
      const [px, py] = positions[index];
      const shot = aiDropShot({ weapon, record: record.address ?? 0, px: px << 16, py: py << 16, tx: enemy.x, ty: enemy.y,
        radius, damage }, host);
      if (!shot) continue;
      const candidate = toPlan(shot);
      if (!found || aiComparePlans(plan, candidate, ai.skill) < 0) { copyPlan(plan, candidate); plan[14] = index; }
      found++;
    }
  }
  if (!found) return 0;
  const [ox, oy] = host.ownPosition();
  const [dx, dy] = entryAt(positions, plan[14]);
  if (!aiRefreshEscapes(ai, host, dx << 16, dy << 16)) { plan[6] = 0; return 0; }
  const fail = () => { plan[6] = 0; restore(host, ox, oy); return 0; };
  if (!host.teleport(dx << 16, dy << 16)) return fail();
  const index = aiChooseEscape(ai, host, ai.escapes, plan[11], plan[12], 2);
  if (index < 0) return fail();
  const [ex, ey] = ai.escapes[index];
  if (!host.teleport(ex << 16, ey << 16)) return fail();
  [plan[3], plan[4]] = host.estimate(plan[9], plan[10], plan[7], plan[8], 0);
  restore(host, ox, oy);
  plan[15] = index;
  return 1;
}
// 004F1AC0 (0x6F) select with fuse 5, 004F1B10 (0x70) face then drop,
// 004F1BB0 (0x71) walk to the escape row chosen at evaluation (word 15).
export function aiDropState(ai, plan, { wormState }, host) {
  if (ai.state === 0x6f) { ai.action = 0x6d; ai.fuse = 5; aiSetState(ai, 0x70); }
  else if (ai.state === 0x70) {
    if (!idle(wormState)) return;
    if (plan[13]) { ai.action = plan[13] >= 0 ? 0x67 : 0x66; plan[13] = 0; return; }
    ai.action = 0x6a; aiSetState(ai, 0x71);
  } else if (ai.state === 0x71 && idle(wormState)) aiGoThen(ai, 0x64, entryAt(ai.escapes, plan[15]), host);
}

// ------------------------------------------------------------------ strike (family 4)
// 004F1400: release point and drop line for a strike on (tx, ty) entered from
// direction `dir`. record: aimed (+0xC8: 0 bombs fall from the plane), count
// (+0x74), spacing (+0x78), speed (+0x7C). ax = wind * record+0x6C / 100.
// Words 9/10 position, 11/12 target, 13/14 terrain hit, 15 release x,
// 16 release y (target y), 17 direction, 18 = -1.
export function aiStrikeShot({ weapon, record = 0, px, py, tx, ty, ax, radius, damage, dir }, rec, host) {
  let release;
  if (!rec.aimed) {
    const g = host.gravity(), step = div(Math.imul(rec.speed, dir) << 16, 25);
    let y = 0xff300000 | 0, vy = 0, drift = 0; // 208 pixels above the top
    if (ty > y) do { vy = (vy + g) | 0; drift = (drift + step) | 0; y = (y + vy) | 0; } while (ty > y);
    release = (((tx - div(Math.imul(Math.imul(rec.count, rec.spacing), dir) << 16, 2)) | 0) - drift) | 0;
  } else release = (tx - fixedMultiply((ty + 0xd00000) | 0, ax)) | 0;
  const [, nx, ny] = normalize((tx - release) | 0, (ty + 0xd00000) | 0);
  let hx, hy;
  for (let t = 0; ; t = (t + 0x10000) | 0) {
    hx = ((release + fixedMultiply(nx, t)) | 0) >> 16;
    hy = ((fixedMultiply(ny, t) - 0xd00000) | 0) >> 16;
    if (host.water < hy) return null;
    if (squareHit(host.solid, hx, hy, 4)) break;
  }
  if (!rec.aimed) release = (tx - fixedMultiply((ty + 0xd00000) | 0, ax)) | 0;
  const [enemy, friendly] = host.estimate(hx << 16, hy << 16, radius, damage, 0);
  return { 1: weapon, 2: record, 3: enemy, 4: friendly, 6: 4, 7: radius, 8: damage, 9: px, 10: py, 11: tx, 12: ty,
    13: hx << 16, 14: hy << 16, 15: release, 16: ty, 17: dir, 18: -1 };
}
// 004F1730: one direction. record.bomb = the +0x88 sub-record for aiWeaponBlast
// (blast +0xA0, mode +0x13C, extra +0x164, extraCount +0x144); radius and damage
// are multiplied by the bomb count. Donkey (0x36) skips positions within 256
// pixels of the target column. Word 18 = position index.
export function aiStrikeSearch(ai, plan, weapon, rec, dir, host) {
  plan[6] = 0;
  const positions = host.positions;
  if (!positions.length) return 0;
  if (!host.ammo(weapon)) return 0;
  let [radius, damage] = aiWeaponBlast(rec.bomb);
  radius = Math.imul(radius, rec.count); damage = Math.imul(damage, rec.count);
  const ax = div(Math.imul(host.wind(), rec.windPct), 100);
  let found = 0;
  for (const enemy of enemiesOf(ai, host)) {
    const stride = Math.max(1, div(positions.length, 10));
    ai.seed = nextAiRandom(ai.seed);
    const start = ((ai.seed >>> 16) % stride) | 0;
    host.yield();
    for (let index = start; index < positions.length; index += stride) {
      const [px, py] = positions[index];
      if (weapon === 0x36 && abs(px - (enemy.x >> 16)) < 0x100) continue;
      const [ox, oy] = host.ownPosition();
      if (!host.teleport(px << 16, py << 16)) continue;
      const shot = aiStrikeShot({ weapon, record: rec.address ?? 0, px: px << 16, py: py << 16, tx: enemy.x, ty: enemy.y,
        ax, radius, damage, dir }, rec, host);
      if (shot) {
        const candidate = toPlan(shot);
        if (!found || aiComparePlans(plan, candidate, ai.skill) < 0) { copyPlan(plan, candidate); plan[18] = index; }
        found++;
      }
      restore(host, ox, oy);
    }
  }
  return found ? 1 : 0;
}
// 004F1A50: entering from the left (-1) first; only when that finds a plan is
// the right (+1) tried and kept if it ranks better.
export function aiStrikeEvaluate(ai, plan, weapon, rec, host) {
  if (!aiStrikeSearch(ai, plan, weapon, rec, -1, host)) return 0;
  const other = new Array(24).fill(0);
  if (aiStrikeSearch(ai, other, weapon, rec, 1, host) && aiComparePlans(plan, other, ai.skill) < 0) copyPlan(plan, other);
  return 1;
}
// 004F1270 (0x72): jitter the release x by skill and send the target (event
// 0x41A through action 0x6E: x, y pixels, mode = direction); 004F12E0 (0x73)
// fire; 004F1350 (0x74) escape from the hit point (words 13/14, mode 3).
export function aiStrikeState(ai, plan, { wormState }, host) {
  if (ai.state === 0x72) {
    ai.seed = nextAiRandom(ai.seed);
    plan[15] = (plan[15] + 2 * Math.imul((100 - ai.skill) | 0, (((ai.seed >>> 0) & 0xffff00) >>> 8) - 0x8000)) | 0;
    ai.x = plan[15] >> 16; ai.targetMode = plan[17]; ai.action = 0x6e; ai.y = plan[16] >> 16;
    aiSetState(ai, 0x73);
  } else if (ai.state === 0x73) {
    if (idle(wormState)) { ai.action = 0x6a; aiSetState(ai, 0x74); }
  } else if (ai.state === 0x74 && idle(wormState)) escapeWalk(ai, host, plan[13], plan[14], 3);
}

// ------------------------------------------------------------------ teleport (slot 0x28)
// 004F0F60: settle (x, y) onto the ground in 8- then 1-pixel steps through the
// object query with the own worm's flags; 0 when occupied or over water.
function settle(host, pos) {
  const flags = host.wormFlags(), q = (y) => host.collides(3, pos.x, y, flags);
  const floor = (host.water - 0x40) << 16;
  if (q(pos.y)) return 0;
  if (!q((pos.y + 0x80000) | 0)) {
    while (floor > pos.y) { pos.y = (pos.y + 0x80000) | 0; if (q((pos.y + 0x80000) | 0)) break; }
  }
  if (!q((pos.y + 0x80000) | 0)) return 0;
  if (!q((pos.y + 0x10000) | 0)) {
    while (floor > pos.y) { pos.y = (pos.y + 0x10000) | 0; if (q((pos.y + 0x10000) | 0)) break; }
  }
  return 1;
}
// 004EF0E0: nearest task whose type bit is in `mask` (own worm included).
function nearestTask(host, x, y, mask) {
  let best = null;
  for (const t of host.tasks()) {
    if (!((1 << (t.type & 31)) & mask)) continue;
    const d = (abs((y - t.y) | 0) + abs((x - t.x) | 0)) | 0;
    if (best === null || best > d) best = d;
  }
  return best;
}
// 004F10A0: 50 random map points (AI LCG, yield each), settled on the ground,
// at least 0x9999 of combined water escape, 64 pixels from worms/objects
// (types 2, 10, 11, 12) and 256 pixels from the own worm; prefers far and high.
// held = worm snapshot +0x3C. Returns [x, y] or null.
export function aiTeleportSearch(ai, host, held) {
  if (held && held !== 0x28) return null;
  if (!host.ammo(0x28)) return null;
  const [ox, oy] = host.ownPosition();
  let best = null, bestScore = 0;
  for (let i = 0; i < 50; i++) {
    host.yield();
    ai.seed = nextAiRandom(ai.seed);
    const pos = { x: ((ai.seed & 0xffff) % 0x780) << 16 };
    ai.seed = nextAiRandom(ai.seed);
    pos.y = ((ai.seed & 0xffff) % 0x780) << 16;
    if (!settle(host, pos)) continue;
    const left = aiWaterEscape(host, pos.x >> 16, pos.y >> 16, -1), right = aiWaterEscape(host, pos.x >> 16, pos.y >> 16, 1);
    if (((left + right) | 0) > 0x9999) continue;
    const near = nearestTask(host, pos.x, pos.y, 0x1c04);
    if (near !== null && near < 0x400000) continue;
    const distance = (abs((oy - pos.y) | 0) + abs((ox - pos.x) | 0)) | 0;
    if (distance < 0x1000000) continue;
    const score = (distance - Math.imul(pos.y, 40)) | 0;
    if (best && score <= bestScore) continue;
    best = [pos.x, pos.y]; bestScore = score;
  }
  return best;
}
// 004F0E40: aim the teleport at (x, y) and start state 0x75.
export function aiTeleportStart(ai, x, y) {
  ai.weapon = 0x28; ai.targetMode = 0; ai.x = x >> 16; ai.y = y >> 16;
  aiSetState(ai, 0x75);
}
// 004F0E80 (0x75) select + target (action 0x6E), 004F0EA0 (0x76) fire, 004F0F10 (0x77) done.
export function aiTeleportState(ai, { wormState }) {
  if (ai.state === 0x75) { ai.action = 0x6e; aiSetState(ai, 0x76); }
  else if (ai.state === 0x76) { if (idle(wormState)) { ai.action = 0x6a; aiSetState(ai, 0x77); } }
  else if (ai.state === 0x77 && idle(wormState)) aiSetState(ai, 0x64);
}

// ------------------------------------------------------------------ 004CE3A0
// Weapon-group order with the original side effects: the own worm's collision
// is re-registered around the search (scene+0x7D4 vtable+0x30, landscape
// scene+0x2F4 into AI+0x2DC8), and two shared logic draws (004EE960) whose
// results are discarded. host: canAttack/forced/selected (team snapshot
// +0xC/+0x14/+0x10), wormWeapon (worm snapshot +0x3C), airStrikeAllowed
// (AI+0x2B18), landscape, register(landscape, own, flags, phase), logicRandom(),
// ammo/weight/evaluate for aiWeaponTrial, ownPosition, blocked, water.
export function aiSearchOrder(ai, plan, host) {
  const entry = ai.seed;
  const [ox, oy] = host.ownPosition();
  if (!host.canAttack) return;
  const flags = host.wormFlags();
  host.register(flags & 2, 0); host.register(flags & ~2, 1);
  const trial = (group) => aiWeaponTrial(ai, plan, [...group, 0], 4, entry, host);
  if (host.forced) {
    if (aiEvaluateWeapon(ai, plan, host.selected, host.evaluate)) { plan[5] = entry; plan[0] = ai.stamp | 0; }
    return;
  }
  if (host.wormWeapon) { host.list = [host.wormWeapon, 0]; trial([host.wormWeapon]); return; }
  const good = () => plan[6] && !plan[4] && plan[3];
  ai.seed = nextAiRandom(ai.seed);
  const g = AI_WEAPON_GROUPS;
  if (ai.seed & 0x10000) { trial(g.bazooka); trial(g.grenade); } else { trial(g.grenade); trial(g.bazooka); }
  trial(g.placed); trial(g.shotgun);
  const left = aiWaterEscape(host, ox >> 16, oy >> 16, -1), right = aiWaterEscape(host, ox >> 16, oy >> 16, 1);
  if (good() && ((left + right) | 0) <= 0x10000) host.logicRandom(); else trial(g.firePunch);
  if (good()) { ai.seed = nextAiRandom(ai.seed); if (host.airStrikeAllowed) trial(g.airStrike); }
  else trial(g.airStrike);
  if (plan[6] && !plan[3]) host.logicRandom();
  if (!good()) trial(g.fallback);
}
// 004EE960: shared logic random (scene+0x1ACC advanced with scene+0x7F0 added).
export const nextLogicRandom = (seed, frame) => (Math.imul((seed + frame) | 0, 0x19660d) + 0x3c6ef35f) | 0;

function toPlan(words) {
  const plan = new Array(24).fill(0);
  for (const [k, v] of Object.entries(words)) plan[k] = v;
  return plan;
}
function copyPlan(plan, candidate) { for (let k = 0; k < 24; k++) plan[k] = candidate[k]; }
