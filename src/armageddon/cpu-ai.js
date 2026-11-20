// Original CPU-team AI of WA 3.0.0.0 (task vtable 00526958, 0x2DD4 bytes,
// constructor 004CCFA0). The task is a coroutine (base 004F0B70 with a private
// 0x10000-byte stack): 004D0C30 resumes it on every frame event 0x3EA, the body
// 004D0C60 calls one think step 004D0760 and yields, and long searches yield
// again inside (004F39A0 yields on every other candidate position). The AI
// drives its worm only through the same controller events a human sends.
//
// Plans are 24-word native records (0x60 bytes, the live one at AI+0x2958):
//   +0x00 stamp (team snapshot +0x170), +0x04 weapon, +0x08 weapon record,
//   +0x0C enemy damage, +0x10 friendly damage, +0x14 AI seed, +0x18 family
//   (1 strike/drop, 2 gun, 3 ballistic, 4 melee, 5 utility), +0x1C.. family data.
// Ballistic (family 3, 004F3490): +0x24 requested ticks, +0x28 flown ticks,
// +0x2C/+0x30 launch x/y, +0x34/+0x38 target, +0x3C/+0x40 impact, +0x44/+0x48
// launch velocity, +0x4C aim, +0x50 power, +0x54 curvature error, +0x58 facing,
// +0x5C reachable-position index. All coordinates are 16.16, native y-down.
import { fixedMultiply, fixedDivide } from "./numeric.js";
import { nativeSin, nativeCos } from "./trig.js";
import { nativeDirectionTurn } from "./direction.js";
import { nativeVectorLength } from "./blast-damage.js";

const abs = (v) => ((v ^ (v >> 31)) - (v >> 31)) | 0;
const div = (a, b) => (Math.trunc((a | 0) / (b | 0)) | 0);
const clamp = (v, lo, hi) => (v > lo ? (v < hi ? v : hi) : lo); // 0049BF90 (lo wins when lo > hi)
const quantizeAim = (v) => div(Math.imul(v & 0xfffffe00, 0x80), 0x80); // 0x200 steps, signed 25-bit wrap
const quantizePower = (v) => fixedMultiply(fixedDivide(v, 0x369) >> 16 << 16, 0x369); // 75 levels

// 004CD330: the AI's private LCG at AI+0x2954 (seeded from the logic seed scene+0x1ACC).
export const nextAiRandom = (seed) => (Math.imul(seed | 0, 0x19660d) + 0x3c6ef35f) | 0;
// Skill jitter used by 004F2FD0/004F2780: ((100-skill) * (byte-scaled sample - 0x8000)) / 800.
export const aiSkillJitter = (seed, skill) =>
  div(Math.imul((100 - skill) | 0, (((seed >>> 0) & 0xffff00) >>> 8) - 0x8000), 800);

// Weighted picker 004CBB90 (AI+0x2DCC, 0x47 entries).
export const createAiPicker = (capacity = 0x47) => ({ capacity, entries: [] });
export function aiPickerAdd(picker, item, weight) { // 004CBC50
  if (weight < 1 || picker.entries.length >= picker.capacity) return 0;
  if (picker.entries.some(([value]) => value === item)) return 0;
  picker.entries.push([item, weight]);
  return 1;
}
export function aiPickerPick(picker, value) { // 004CBCD0 -> item or null
  if (!picker.entries.length) return null;
  let total = 0, sum = 0;
  for (const [, weight] of picker.entries) total = (total + weight) | 0;
  const sample = value & 0xffff;
  for (const [item, weight] of picker.entries) {
    sum = (sum + weight) | 0;
    if (div(sum << 16, total) > sample) return item;
  }
  return null;
}
export function aiPickerRemove(picker, item) { // 004CBDB0
  const index = picker.entries.findIndex(([value]) => value === item);
  if (index < 0) return 0;
  picker.entries.splice(index, 1);
  return 1;
}

// 004CF940: enemy damage discounted by family-specific risk, and friendly damage.
export function aiPlanOutcome(plan) {
  let enemy = plan[3];
  const scale = (value) => (enemy = fixedMultiply(enemy, value));
  if (plan[6] === 2) scale(clamp((div((abs(plan[11] - plan[15]) + abs(plan[10] - plan[14])) | 0, -0x780) + 0x10000) | 0, 0, 0x10000));
  else if (plan[6] === 4) scale(clamp((div((abs(plan[9] - plan[13]) + abs(plan[10] - plan[14])) | 0, -0x780) + 0x10000) | 0, 0, 0x10000));
  else if (plan[6] === 3) {
    const penalty = (div(plan[21], 2) + div((abs(plan[12] - plan[16]) + abs(plan[11] - plan[15])) | 0, 0x780) +
      div(plan[10] << 16, 250)) | 0;
    scale(clamp((0x10000 - penalty) | 0, 0x1999, 0x10000));
  }
  return [enemy, plan[4]];
}
// Family scores used when both plans share a family (q = plan+0x1C).
function familyScore(plan, skill) {
  const q = plan.slice(7), net = (plan[3] - plan[4]) | 0, e = plan[3], f = plan[4];
  switch (plan[6]) {
    case 1: case 4: { // 004F1CE0 / 004F16C0
      const d = q[0] > 0 ? q[0] : 0;
      return (div(Math.imul(net, 0x10000), 20) + Math.imul(clamp(div((abs(q[2] - q[4]) + abs(q[3] - q[5])) | 0, d), 0, 0x10000), 10)) | 0;
    }
    case 2: // 004F2CC0
      return (Math.imul(div(Math.imul(net, 0x10000), 20), 5) -
        Math.imul(clamp(div((abs(q[7] - q[5]) + abs(q[8] - q[6])) | 0, 0x780), 0, 0x10000), 20) -
        Math.imul(clamp(div(q[2], 0x780), 0, 0x10000), 20)) | 0;
    case 3: { // 004F3890 (thiscall: skill = AI+0xDC)
      const miss = clamp(div((abs(q[9] - q[7]) + abs(q[8] - q[6])) | 0, 0x780), 0, 0x10000);
      const reach = clamp(div((abs(q[5] - q[9]) + abs(q[4] - q[8])) | 0, 0x780), 0, 0x10000);
      return (Math.imul(miss, -1000) + Math.imul(reach, -1000) +
        Math.imul((div(Math.imul((skill * 3 - 300) | 0, 5), 100) - 10) | 0, q[14]) +
        Math.imul(div(q[3] << 16, 250), (div(Math.imul((skill - 100) | 0, 30), 100) - 10) | 0) +
        Math.imul(div(Math.imul(net, 0x10000), 100), 230)) | 0;
    }
    default: return (e - f) | 0; // 004F23C0
  }
}
// 004CFA90: -1 when candidate should replace best, 1 to keep best.
export function aiComparePlans(best, candidate, skill) {
  const family = best[6];
  if (!family) return -1;
  if (!best[4] && candidate[4]) return 1;
  if (best[4] && !candidate[4]) return -1;
  if (!best[3]) { if (candidate[3]) return -1; } else if (!candidate[3]) return 1;
  if (candidate[6] === family && family >= 1 && family <= 5)
    return familyScore(candidate, skill) <= familyScore(best, skill) ? 1 : -1;
  const [e1, f1] = aiPlanOutcome(best), [e2, f2] = aiPlanOutcome(candidate);
  const ratio = (e, f) => div(Math.imul((e + 0x19) | 0, 0x10000), (f + 0x19) | 0);
  return div(Math.imul(ratio(e2, f2), 5), 6) <= ratio(e1, f1) ? 1 : -1;
}

// 004CE7D0 dispatch: weapon slot -> evaluator family.
export function aiWeaponFamily(weapon) {
  if ([1, 6, 7, 8, 0x2a, 0x2b, 0x2f].includes(weapon)) return "ballistic"; // 004F3F00
  if ([0xb, 0xc, 0xd, 0xe].includes(weapon)) return "gun";                  // 004F2D50
  if ([0x10, 0x11, 0x12, 0x14, 0x23].includes(weapon)) return "melee";      // 004F2470
  if ([0x15, 0x16, 0x31].includes(weapon)) return "drop";                   // 004F1FC0
  if ([0x1b, 0x1c, 0x1d, 0x2e, 0x32, 0x33, 0x36].includes(weapon)) return "strike"; // 004F1A50
  return null;
}
// 004CE7D0: evaluate one weapon, then apply the aggression/skill friendly-fire filter.
// evaluate(family, weapon, plan) fills plan and returns nonzero on success.
export function aiEvaluateWeapon(ai, plan, weapon, evaluate) {
  const family = aiWeaponFamily(weapon);
  if (!family) return 0;
  let result = evaluate(family, weapon, plan);
  if (!result) return result;
  const scale = (div(ai.skill, 3) + 0x78) | 0;
  const friendly = div(Math.imul((scale - ai.aggression) | 0, plan[4]), scale);
  plan[4] = friendly;
  const divisor = (div(Math.imul((8 - ai.teams) | 0, 6), 8) + 2) | 0;
  if (friendly && div(plan[3], divisor) <= friendly) { plan[6] = 0; result = 0; }
  return result;
}
// 004CE270: weighted random weapon trial. Returns the (possibly replaced) best plan.
// host: ammo(weapon) (004C2EE0, -1 infinite), weight(weapon) (record+0x200), evaluate.
export function aiWeaponTrial(ai, best, weapons, tries, seed, host) {
  const picker = ai.picker ?? (ai.picker = createAiPicker());
  picker.entries.length = 0;
  for (const weapon of weapons) {
    if (!weapon) break;
    let ammo = host.ammo(weapon);
    if (!ammo) continue;
    if (ammo < 0 || ammo > 20) ammo = 20;
    aiPickerAdd(picker, weapon, Math.imul(host.weight(weapon), ammo + 1));
  }
  for (let left = tries; left; left--) {
    ai.seed = nextAiRandom(ai.seed);
    const weapon = aiPickerPick(picker, ai.seed >>> 8);
    if (weapon === null) return best;
    aiPickerRemove(picker, weapon);
    const candidate = new Array(24).fill(0);
    if (!aiEvaluateWeapon(ai, candidate, weapon, host.evaluate)) continue;
    if (aiComparePlans(best, candidate, ai.skill) < 0) {
      candidate[5] = seed | 0; candidate[0] = ai.stamp | 0;
      best.splice(0, 24, ...candidate);
    }
    return best;
  }
  return best;
}
// 004CE3A0 weapon-group order (read from code, not executed: the original toggles
// the own worm's collision flag through scene+0x7D4 vtable+0x30 around it and
// measures escape routes with 004CEFD0). trial(group) runs aiWeaponTrial with
// 4 tries and the seed saved on entry; logicRandom() is the shared 004EE960 draw.
export const AI_WEAPON_GROUPS = {
  grenade: [6], bazooka: [1], placed: [21, 22], shotgun: [11], firePunch: [16], airStrike: [27],
  fallback: [13, 11, 12, 14, 16, 1, 6, 47, 7, 8, 43, 49, 21, 22, 54, 46, 27, 51, 50, 29, 28],
};
export function aiShotSearchOrder(ai, plan, host) {
  const good = () => plan[6] && !plan[4] && plan[3];
  if (!host.canAttack) return;                                    // team snapshot +0xC
  if (host.forcedWeapon) return host.evaluateForced(host.forcedWeapon); // team snapshot +0x14
  if (host.wormWeapon) return host.trial([host.wormWeapon]);       // worm snapshot +0x3C
  ai.seed = nextAiRandom(ai.seed);
  const first = ai.seed & 0x10000 ? AI_WEAPON_GROUPS.bazooka : AI_WEAPON_GROUPS.grenade;
  host.trial(first); host.trial(first === AI_WEAPON_GROUPS.bazooka ? AI_WEAPON_GROUPS.grenade : AI_WEAPON_GROUPS.bazooka);
  host.trial(AI_WEAPON_GROUPS.placed); host.trial(AI_WEAPON_GROUPS.shotgun);
  const [left, right] = host.escape();                             // 004CEFD0(x,y,-1/+1)
  if (good() && ((left + right) | 0) <= 0x10000) host.logicRandom(); else host.trial(AI_WEAPON_GROUPS.firePunch);
  if (good()) { ai.seed = nextAiRandom(ai.seed); if (host.airStrikeAllowed) host.trial(AI_WEAPON_GROUPS.airStrike); }
  else host.trial(AI_WEAPON_GROUPS.airStrike);
  if (plan[6] && !plan[3]) host.logicRandom();
  if (!good()) host.trial(AI_WEAPON_GROUPS.fallback);
}

// 004F32D0: walk a segment in (|dx|+|dy|)/6+1 steps and test eight distinct points
// of a square of half-size r (the left middle point twice, the right middle never).
export function aiSegmentProbe(position, x1, y1, r, solid) {
  const x0 = position.x, y0 = position.y, dx = (x1 - x0) | 0, dy = (y1 - y0) | 0;
  const steps = (div((abs(dy) + abs(dx)) >> 16, 6) + 1) | 0;
  for (let i = 0; i <= steps; i++) {
    position.x = (x0 + div(Math.imul(i, dx), steps)) | 0;
    position.y = (y0 + div(Math.imul(i, dy), steps)) | 0;
    const x = position.x >> 16, y = position.y >> 16;
    for (const [px, py] of [[x - r, y - r], [x, y - r], [x + r, y - r], [x - r, y], [x, y], [x - r, y],
      [x - r, y + r], [x, y + r], [x + r, y + r]]) if (solid(px | 0, py | 0)) return 1;
  }
  return 0;
}

// 004F3490: solve the launch for a flight of `ticks` frames under (ax, ay) per
// frame, quantize it to the controls (aim 0x200 steps, power 0x369 steps),
// simulate the quantized shot against terrain and record it with its blast
// estimate. host: solid(x,y), closedTop (scene+0x1B8AC), bordered (scene byte
// 0x11D67), estimate(x, y, radius, damage) -> [enemy, friendly] (004CF130 with
// exclude flag 0). Returns null or the plan words it writes (others untouched).
export function aiBallisticShot(input, host) {
  let { weapon, record = 0, launch, x0, y0, tx, ty, ax, ay, ticks, radius, damage, allowMiss } = input;
  const half = div(Math.imul((ticks + 1) | 0, ticks), 2);
  const vx = div(((tx - Math.imul(half, ax)) | 0) - x0, ticks), vy = div(((ty - Math.imul(half, ay)) | 0) - y0, ticks);
  // 0049BF50 returns the length and normalizes the vector in place; the angle uses the unit vector.
  const length = nativeVectorLength(vx, vy);
  const nx = length ? fixedDivide(vx, length) : vx, ny = length ? fixedDivide(vy, length) : vy;
  const power = quantizePower(div(length, 24));
  let turn = nativeDirectionTurn(nx, -ny | 0) & 0xffff, facing;
  if (turn < 0x8000) { facing = 1; turn = ((0x8000 - turn) * 2) | 0; } else { facing = -1; turn = (turn * 2 - 0x10000) | 0; }
  const aim = clamp(quantizeAim(turn), 0, 0x10000);
  const angle = div(facing < 0 ? (0x20000 - aim) | 0 : aim, 2);
  let sx = nativeSin(angle), sy = nativeCos(angle);
  if (launch === 3 || launch === 7) { x0 = (x0 + Math.imul(sx, 14)) | 0; y0 = (y0 + Math.imul(sy, 14)) | 0; }
  sx = Math.imul(fixedMultiply(sx, power), 24); sy = Math.imul(fixedMultiply(sy, power), 24);
  if (power < 0x1999 || power > 0x10000) return null;
  const position = { x: x0, y: y0 };
  let hit = 0, flown = 0, ix = 0, iy = 0, wx = sx, wy = sy;
  while (flown <= ticks && !hit) {
    wx = (wx + ax) | 0; wy = (wy + ay) | 0;
    hit = aiSegmentProbe(position, (position.x + wx) | 0, (position.y + wy) | 0, 4, host.solid);
    ix = position.x >> 16; iy = position.y >> 16;
    if (host.closedTop && iy <= 8) return null;
    if (host.bordered && (ix <= 8 || ix >= 0x778 || iy >= 0x2b0)) return null;
    flown++;
  }
  if (flown <= 0 || (!hit && !allowMiss)) return null;
  const error = div(div((abs(ix - ((Math.imul(sx, flown) + x0) >> 16)) + abs(iy - ((Math.imul(sy, flown) + y0) >> 16))) | 0, flown) << 16, 15);
  const [enemy, friendly] = host.estimate(ix << 16, iy << 16, radius, damage);
  const plan = {};
  Object.assign(plan, { 1: weapon, 2: record, 3: enemy, 4: friendly, 6: 3, 7: radius, 8: damage, 9: ticks, 10: flown,
    11: x0, 12: y0, 13: tx, 14: ty, 15: ix << 16, 16: iy << 16, 17: sx, 18: sy, 19: aim, 20: power, 21: error,
    22: facing, 23: -1 });
  return plan;
}

// 004CF130: score a blast at (x,y). worms: {team, worm, x, y, self} from the task
// registry in its order (non-worm tasks and failed snapshots omitted by the host).
// world: {damageScale: scene+0x814, water: scene+0x804, health(t,w), altHealth(t,w)
// (004C2CF0), teamFlag(t) (004C3180), alliance(t), ally(t) (byte scene+0x3CD4+t*3000),
// double(t) (byte scene+0x4888+t*3000 >= 0), rangeWord (u16 scene+0x4734 + own record)}.
export function aiBlastEstimate(ai, worms, world, x, y, radius, damage, excludeSelf = 0) {
  let enemy = 0, friendly = 0;
  if (!radius) return [0, 0];
  for (const worm of worms) {
    if (excludeSelf && worm.self) continue;
    const distance = nativeVectorLength((worm.x - x) | 0, (worm.y - y) | 0) >> 16;
    if (distance > radius) continue;
    let hurt = Math.imul(div(Math.imul((radius - distance) | 0, damage), radius), world.damageScale);
    if (hurt <= 0) continue;
    const health = world.health(worm.team, worm.worm);
    if (hurt > 10) {
      hurt = clamp(hurt, 0, health);
      if (hurt > 10 && div(health * 3, 2) < hurt) hurt = world.altHealth(worm.team, worm.worm);
    }
    const depth = clamp(div((0x640000 - abs(((world.water << 16) - worm.y) | 0)) | 0, 100), 0, 0x20000);
    hurt = Math.imul(hurt, (depth + 0x10000) | 0) >> 16;
    if (world.teamFlag(worm.team)) hurt = 0;
    let kind = world.alliance(worm.team) === world.alliance(ai.team) ? 2 : 0;
    if (!kind && world.ally(worm.team)) kind += 4;
    if (!kind && world.rangeWord && ((abs((ai.y - worm.y) | 0) + abs((ai.x - worm.x) | 0)) >> 16) > world.rangeWord) kind += 4;
    if (kind) { friendly = (friendly + Math.imul(kind + 1, hurt)) | 0; continue; }
    if (worm.team === ai.targetTeam) hurt = worm.worm === ai.targetWorm ? Math.imul(hurt, 3) : Math.imul(hurt, 2);
    if (world.double(worm.team)) hurt = Math.imul(hurt, 2);
    enemy = (enemy + hurt) | 0;
  }
  return [enemy, div(Math.imul((ai.skill + 0x1e) | 0, friendly), 0x82)];
}

// 004CD350: switch state with the standard 10-frame pause.
export function aiSetState(ai, state) {
  ai.replanned = 0; ai.delay = 10;
  if (state === 0x69) ai.field2930 = 0;
  ai.state = state;
}
// 004F2FD0 (state 0x67): add skill jitter to the planned aim and power,
// set the fuse from the flight time, and choose the select/fuse action.
// hasFuse: 004AAC50 first output for the weapon record; selected: team snapshot +0x10.
export function aiBallisticFireSetup(ai, { hasFuse, selected }) {
  ai.seed = nextAiRandom(ai.seed);
  ai.aim = (aiSkillJitter(ai.seed, ai.skill) + ai.aim) | 0;
  ai.aim = clamp(quantizeAim(ai.aim), 0, 0x10000);
  ai.seed = nextAiRandom(ai.seed);
  ai.power = clamp((aiSkillJitter(ai.seed, ai.skill) + ai.power) | 0, 0x1999, 0x10000);
  ai.power = quantizePower(ai.power);
  if (hasFuse) ai.fuse = clamp(div((ai.flightTicks + 0x19) | 0, 0x32), 1, 5);
  if (ai.weapon === selected) { if (hasFuse) ai.action = 0x6b; }
  else ai.action = hasFuse ? 0x6d : 0x6c;
  aiSetState(ai, 0x68);
}
// 004F3190 (state 0x68) / 004F2830 (gun state 0x6d): face, then step the aim
// one event per think step. wormState from worm vtable+0x7C, aim = snapshot+0xC.
export function aiAimStep(ai, { wormState, aim }, gun = false) {
  if (wormState < 0x65 || wormState > 0x67) return;
  const facingKey = gun ? "gunFacing" : "facing", target = gun ? ai.gunAim : ai.aim;
  if (ai[facingKey]) { ai.action = ai[facingKey] >= 0 ? 0x67 : 0x66; ai[facingKey] = 0; return; }
  if (aim !== target) { ai.action = aim > target ? 0x71 : 0x70; return; }
  if (gun) { ai.action = 0x6a; aiSetState(ai, 0x6e); } else aiSetState(ai, 0x69);
}
// 004F3250 (state 0x69): press fire when ready, release at the planned power.
// phase = worm snapshot +0x8 (0x67 ready, 0x68 charging), charge = snapshot +0x10.
export function aiChargeStep(ai, { phase, charge }) {
  if (phase === 0x67) { ai.action = 0x68; return; }
  if (phase !== 0x68) aiSetState(ai, 100);
  if (charge === ai.power) { ai.action = 0x69; aiSetState(ai, 0x6a); }
}
// 004F2780 (gun state 0x6c): select the gun if needed and jitter its aim.
export function aiGunSetup(ai, { selected }) {
  if (ai.weapon !== selected) ai.action = 0x6c;
  ai.seed = nextAiRandom(ai.seed);
  ai.gunAim = clamp(quantizeAim((aiSkillJitter(ai.seed, ai.skill) + ai.gunAim) | 0), 0, 0x10000);
  aiSetState(ai, 0x6d);
}

// 004D0760: action code (AI+0xEC) -> controller events, each sent through the
// AI's queue to task class 0x14 (004B26A0(ai, 0x14, 0, event, size, payload)).
// Payload word0 is the AI team. Nothing is sent when the team has no current worm.
export const AI_EVENT = {
  LEFT: 0x406, RIGHT: 0x407, AIM_UP: 0x408, AIM_DOWN: 0x409, FACE_LEFT: 0x40a, FACE_RIGHT: 0x40b,
  JUMP: 0x40c, BACKFLIP: 0x40d, FIRE_DOWN: 0x40e, FIRE_UP: 0x40f, SKIP: 0x410, FUSE: 0x417, TARGET: 0x41a,
  SELECT: 0x41b, NEXT_WORM: 0x42b,
};
export function aiActionEvents(ai, currentWorm) {
  if (!currentWorm) return [];
  const t = [ai.team], fuse = [ai.team, currentWorm, (ai.fuse - 1) | 0], select = [ai.team, currentWorm, ai.weapon, 1];
  const simple = { 1: [0x407], [-1]: [0x406], 2: [0x40b, 0x40c], [-2]: [0x40a, 0x40c], 3: [0x40a, 0x40c, 0x40c],
    [-3]: [0x40b, 0x40c, 0x40c], 100: [0x410], 0x65: [0x40d], 0x66: [0x40a], 0x67: [0x40b], 0x68: [0x40e], 0x69: [0x40f],
    0x6a: [0x40e, 0x40f], 0x6f: [0x42b], 0x70: [0x408], 0x71: [0x409] };
  if (simple[ai.action]) return simple[ai.action].map((event) => [event, t]);
  if (ai.action === 0x6b) return [[0x417, fuse]];
  if (ai.action === 0x6c) return [[0x41b, select]];
  if (ai.action === 0x6d) return [[0x41b, select], [0x417, fuse]];
  if (ai.action === 0x6e)
    return [[0x41b, select], [0x41a, [ai.team, currentWorm, ((ai.y & 0xffff) << 16 | (ai.x & 0xffff)) | 0, ai.targetMode, 0]]];
  return [];
}

// 004CF820 on record+0x74: blast [radius, damage] the AI uses for a weapon record.
// record fields: blast (+0x8C), mode (+0x128), extra (+0x150), extraCount (+0x130).
export function aiWeaponBlast(record) {
  let radius = (record.blast * 2 + 0x10) | 0, damage = record.blast;
  if (record.mode === 1) { damage = (Math.imul(record.extra, record.extraCount) + damage) | 0; radius = (radius * 2) | 0; }
  return [radius, damage];
}
// 004F39A0: for every enemy worm (other team), sample about ten of the AI's
// reachable positions (stride count/10 from a random start), teleport there,
// sweep flight times tMin..tMax (16.16 seconds, step tStep, 50 frames each) with
// aiBallisticShot and keep the best plan by aiComparePlans. Yields every other
// position. record: launch, blast fields, mode, wind (+0xB4 %), gravity (+0xBC %),
// acceptMiss (+0x204). host: ammo(weapon), wind(), gravity() (scene+0x7D4
// vtable+0x28/+0x24), enemies() -> [{team, x, y}] in registry order (worm tasks
// with a snapshot), positions (AI+0x20F0: [x, y, path]), ownPosition() -> [x, y],
// teleport(x, y) -> bool, wormFlags(), setWormFlags(v), yield(), solid, closedTop,
// bordered, estimate(x, y, radius, damage) (sees the teleported own worm).
export function aiBallisticSearch(ai, plan, weapon, record, tMin, tMax, tStep, fuseMatch, host) {
  const positions = host.positions;
  if (!positions.length || !host.ammo(weapon)) return 0;
  const [radius, damage] = aiWeaponBlast(record);
  const rolling = record.mode === 2;
  const ax = fixedMultiply(div(record.wind << 16, 100), host.wind());
  const ay = fixedMultiply(div(record.gravity << 16, 100), host.gravity());
  const lift = record.mode === 1 ? -0x280000 : 0x80000;
  let found = 0, counter = 0;
  for (const enemy of host.enemies()) {
    if (enemy.team === ai.team) continue;
    const tx = enemy.x, ty = (enemy.y + lift) | 0;
    const stride = Math.max(1, div(positions.length, 10));
    ai.seed = nextAiRandom(ai.seed);
    for (let index = ((ai.seed >>> 16) % stride) | 0; index < positions.length; index += stride) {
      counter = (counter + 1) | 0;
      if (counter & 1) host.yield();
      const [ox, oy] = host.ownPosition();
      const [px, py] = positions[index];
      if (!host.teleport(px << 16, py << 16)) continue;
      for (let t = tMin, t50 = Math.imul(tMin, 50); t <= tMax; t = (t + tStep) | 0, t50 = (t50 + Math.imul(tStep, 50)) | 0) {
        const shot = aiBallisticShot({ weapon, record: record.address ?? 0, launch: record.launch, x0: px << 16, y0: py << 16,
          tx, ty, ax, ay, ticks: t50 >> 16, radius, damage, allowMiss: fuseMatch }, host);
        if (!shot) continue;
        if (fuseMatch && abs((div(shot[10] << 16, 50) - t) | 0) > 0x4ccc) continue;
        if (((abs((shot[16] - shot[14]) | 0) + abs((shot[15] - shot[13]) | 0)) | 0) > 0x200000 && !record.acceptMiss) continue;
        if (rolling) {
          const iy = shot[16] >> 16;
          if (py > iy && abs((shot[15] >> 16) - px) < abs(iy - py)) continue;
          if (((shot[14] >> 16) + 8) < iy) continue;
        }
        // The original candidate is a stack record; words 0 and 5 are never written here.
        const candidate = new Array(24).fill(0);
        for (const [k, v] of Object.entries(shot)) candidate[k] = v;
        if (!found || aiComparePlans(plan, candidate, ai.skill) < 0) {
          for (let k = 0; k < 24; k++) if (k !== 0 && k !== 5) plan[k] = candidate[k];
          plan[23] = index;
        }
        found++;
      }
      const flags = host.wormFlags();
      host.setWormFlags(2); host.teleport(ox, oy); host.setWormFlags(flags);
    }
  }
  return found ? 1 : 0;
}
// 004F3F00: ballistic family evaluator. adjustableFuse is 004AAC50's first output
// (fuse not fixed by the scheme); fuseMs = record+0xC4, impact = record+0x80 bit 1.
export function aiBallisticEvaluate(ai, plan, weapon, record, adjustableFuse, host) {
  plan[6] = 0;
  if (adjustableFuse) return aiBallisticSearch(ai, plan, weapon, record, 0x10000, 0x50000, 0x10000, 1, host);
  if (record.impact & 2) return aiBallisticSearch(ai, plan, weapon, record, 0x1999, 0x30000, 0x6666, 0, host);
  const fixed = div(record.fuseMs << 16, 1000);
  return aiBallisticSearch(ai, plan, weapon, record, fixed, fixed, 0x10000, 1, host);
}
