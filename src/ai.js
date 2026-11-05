import {
  W,
  WATER,
  BODY,
  launch,
  integrate,
  terrainNormal,
  reflectVelocity,
  hitsWorm,
  walkWorm,
  launchGeometry,
} from "./physics.js";
import { WEAPONS, WEAPON_ORDER, ammoFor } from "./weapons.js";

export const DIFFICULTIES = {
  rookie: {
    label: "Rookie",
    angleStep: 10,
    powerStep: 15,
    refine: false,
    angleJitter: 6,
    powerJitter: 8,
    mistake: 0.35,
    maxPower: 88,
    moveChance: 0.4,
  },
  regular: {
    label: "Regular",
    angleStep: 7,
    powerStep: 12,
    refine: true,
    angleJitter: 1.8,
    powerJitter: 3,
    mistake: 0.08,
    maxPower: 100,
    moveChance: 0.8,
  },
  veteran: {
    label: "Veteran",
    angleStep: 5,
    powerStep: 9,
    refine: true,
    angleJitter: 0.3,
    powerJitter: 0.6,
    mistake: 0,
    maxPower: 100,
    moveChance: 1,
  },
};
export const DIFFICULTY_ORDER = ["rookie", "regular", "veteran"];
const STEP = 1 / 60;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function blastPoint(
  terrain,
  worms,
  me,
  kind,
  angle,
  power,
  wind,
  waterLevel,
  fuse,
  bounce,
) {
  const meta = WEAPONS[kind];
  const start = launchGeometry(me, angle, kind, terrain);
  if (start.blocked)
    return { x: start.muzzle.x, y: start.muzzle.y, blocked: true };
  const velocity = launch(angle, power);
  const p = {
    x: start.muzzle.x,
    y: start.muzzle.y,
    vx: velocity.vx * meta.speed,
    vy: velocity.vy * meta.speed,
    age: 0,
  };
  const targets = worms.filter((w) => w.hp > 0);
  const maxAge = meta.timed ? fuse : 12;
  for (let tick = 0; tick < maxAge / STEP; tick++) {
    if (meta.timed && p.age >= fuse) break;
    const ox = p.x,
      oy = p.y;
    integrate(p, STEP, meta.wind ? wind : 0);
    p.age += STEP;
    const distance = Math.hypot(p.x - ox, p.y - oy),
      steps = Math.max(1, Math.ceil(distance / 2));
    let hit = null;
    for (let s = 1; s <= steps && !hit; s++) {
      const x = ox + ((p.x - ox) * s) / steps,
        y = oy + ((p.y - oy) * s) / steps;
      if (terrain.solid(x, y)) hit = { x, y, type: "terrain" };
      else {
        const worm = targets.find(
          (w) => (w !== me || p.age > 0.25) && hitsWorm(w, x, y, 3),
        );
        if (worm) hit = { x, y, type: "worm", worm };
      }
    }
    if (p.y < waterLevel || p.x < -60 || p.x > W + 60)
      return {
        x: p.x,
        y: p.y,
        water: p.y < waterLevel,
        out: p.x < -60 || p.x > W + 60,
      };
    if (!hit) continue;
    p.x = hit.x;
    p.y = hit.y;
    if (!meta.timed) return { x: p.x, y: p.y };
    if (kind === "sticky") return { x: p.x, y: p.y };
    let normal;
    if (hit.type === "worm") {
      const dx = p.x - hit.worm.x,
        dy = p.y - hit.worm.y - BODY.cy,
        length = Math.hypot(dx, dy) || 1;
      normal = { x: dx / length, y: dy / length };
    } else normal = terrainNormal(terrain, p.x, p.y, p.vx, p.vy);
    reflectVelocity(p, normal, bounce);
    p.x = ox + normal.x * 0.3;
    p.y = oy + normal.y * 0.3;
    if (normal.y > 0.5 && Math.hypot(p.vx, p.vy) < 16)
      return { x: p.x, y: p.y, resting: true };
  }
  return { x: p.x, y: p.y, water: p.y < waterLevel };
}

function scoreBlast(point, kind, worms, me) {
  if (!point || point.blocked || point.water || point.out) return -100;
  const meta = WEAPONS[kind],
    radius = meta.radius + 34;
  let score = 0,
    nearest = Infinity;
  for (const w of worms) {
    if (w.hp <= 0) continue;
    const distance = Math.hypot(w.x - point.x, w.y + BODY.cy - point.y);
    if (w.team !== me.team) nearest = Math.min(nearest, distance);
    if (distance >= radius) continue;
    const damage = Math.min(w.hp, (1 - distance / radius) * meta.damage);
    if (w.team === me.team) score -= damage * 1.5;
    else {
      score += damage;
      if (damage >= w.hp) score += 20;
    }
  }
  // Nudge equal-damage shots toward the enemy so the AI does not pick scenery.
  if (Number.isFinite(nearest)) score += Math.max(0, 8 - nearest / 20);
  return score;
}

function evaluate(context, kind, angle, power) {
  const point = blastPoint(
    context.terrain,
    context.worms,
    context.me,
    kind,
    angle,
    power,
    context.wind,
    context.waterLevel,
    context.fuse,
    context.bounce,
  );
  return {
    kind,
    angle,
    power,
    point,
    score:
      scoreBlast(point, kind, context.worms, context.me) +
      (kind === "rocket" ? 0 : -3),
  };
}

function refine(context, seed, stepAngle, stepPower) {
  const results = [];
  for (let da = -stepAngle; da <= stepAngle; da += 2)
    for (let dp = -stepPower; dp <= stepPower; dp += 3) {
      if (da === 0 && dp === 0) continue;
      results.push(
        evaluate(
          context,
          seed.kind,
          clamp(seed.angle + da, 5, 175),
          clamp(seed.power + dp, 15, 100),
        ),
      );
    }
  return results;
}

// Returns the best weapon/angle/power the AI can find in a small time budget.
export function planTurn({
  terrain,
  worms,
  me,
  wind = 0,
  waterLevel = WATER,
  difficulty = "regular",
  ammo = {},
  fuse = 2,
  bounce = 0.55,
  random = Math.random,
}) {
  const profile = DIFFICULTIES[difficulty] ?? DIFFICULTIES.regular;
  if (!worms.some((w) => w.hp > 0 && w.team !== me.team)) return null;
  const kinds = WEAPON_ORDER.filter((kind) => ammoFor(ammo, kind) > 0);
  if (!kinds.length) return null;
  const context = {
    terrain,
    worms,
    me,
    wind,
    waterLevel,
    fuse,
    bounce,
    kinds,
  };
  const candidates = [];
  for (const kind of kinds)
    for (let angle = 8; angle <= 172; angle += profile.angleStep)
      for (
        let power = 20;
        power <= profile.maxPower;
        power += profile.powerStep
      )
        candidates.push(evaluate(context, kind, angle, power));
  candidates.sort((a, b) => b.score - a.score);
  if (profile.refine) {
    const refined = [],
      seen = new Set();
    for (const seed of candidates) {
      if (seen.has(seed.kind)) continue;
      seen.add(seed.kind);
      refined.push(
        ...refine(context, seed, profile.angleStep, profile.powerStep),
      );
      if (seen.size >= 2) break;
    }
    candidates.push(...refined);
    candidates.sort((a, b) => b.score - a.score);
  }
  let pick = candidates[0];
  if (profile.mistake && random() < profile.mistake) {
    const shortlist = candidates.slice(0, Math.min(6, candidates.length));
    pick = shortlist[Math.floor(random() * shortlist.length)];
  }
  const angle = clamp(
    pick.angle + (random() * 2 - 1) * profile.angleJitter,
    5,
    175,
  );
  const power = clamp(
    pick.power + (random() * 2 - 1) * profile.powerJitter,
    15,
    100,
  );
  return {
    weapon: pick.kind,
    angle,
    power,
    fuse: WEAPONS[pick.kind].timed ? fuse : 0,
    bounce,
    score: pick.score,
    baseAngle: pick.angle,
    basePower: pick.power,
    samples: candidates.length,
  };
}

// Small, visible repositioning when the water is close or the worm is on an edge.
export function planMove({
  terrain,
  me,
  waterLevel = WATER,
  difficulty = "regular",
  random = Math.random,
}) {
  const profile = DIFFICULTIES[difficulty] ?? DIFFICULTIES.regular;
  if (!me.ground || me.hp <= 0 || !terrain) return null;
  const nearWater = me.y - 10 < waterLevel + 55,
    nearEdge = me.x < 110 || me.x > W - 110;
  if (!nearWater && !nearEdge) return null;
  if (random() > profile.moveChance) return null;
  const direction = me.x < W / 2 ? 1 : -1;
  const probe = { ...me, vx: 0, vy: 0, knocked: false, ground: true };
  for (let i = 0; i < 30; i++) walkWorm(probe, terrain, direction, STEP);
  if (Math.abs(probe.x - me.x) < 4) return null;
  const climbed = probe.y > me.y + 2,
    leftEdge = Math.abs(probe.x - W / 2) < Math.abs(me.x - W / 2) - 4;
  // Near the water, only climb. Walking toward the middle downhill is a trap.
  if (nearWater ? !climbed : !leftEdge) return null;
  return { direction, time: 0.5 };
}
