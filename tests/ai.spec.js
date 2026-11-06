import { test, expect } from "@playwright/test";
import { planMove, planTurn } from "../src/ai.js";
import { W, WATER } from "../src/physics.js";
import {
  WEAPONS,
  WEAPON_ORDER,
  WATER_RISE,
  MAX_WATER,
  freshAmmo,
  waterLevelForRound,
} from "../src/weapons.js";

const flat = { solid: (x, y) => x >= 0 && x <= W && y < 300 };
const worm = (team, x, y = 312) => ({
  team,
  x,
  y,
  hp: 100,
  ground: true,
  vx: 0,
  vy: 0,
  knocked: false,
});
const base = (overrides = {}) => ({
  terrain: flat,
  me: worm(0, 200),
  wind: 0,
  waterLevel: WATER,
  difficulty: "regular",
  ammo: freshAmmo(),
  fuse: 2,
  bounce: 0.55,
  random: () => 0.5,
  ...overrides,
});

test("sudden death raises the water each round and caps it", () => {
  expect(waterLevelForRound(1)).toBe(WATER);
  expect(waterLevelForRound(5)).toBe(WATER);
  expect(waterLevelForRound(6)).toBe(WATER + WATER_RISE);
  expect(waterLevelForRound(7)).toBe(WATER + WATER_RISE * 2);
  expect(waterLevelForRound(100)).toBe(MAX_WATER);
  expect(WATER_RISE).toBeGreaterThan(0);
});

test("weapon metadata and starting ammo match the loadout", () => {
  expect(WEAPONS.rocket.ammo).toBe(Infinity);
  expect(WEAPONS.mortar.radius).toBeGreaterThan(WEAPONS.rocket.radius);
  expect(WEAPONS.mortar.damage).toBeGreaterThan(WEAPONS.rocket.damage);
  expect(freshAmmo()).toEqual({ grenade: 3, mortar: 2, sticky: 2, mine: 2 });
  expect(WEAPONS.mine.ammo).toBe(2);
  expect(WEAPON_ORDER).not.toContain("mine");
});

test("planner finds a damaging shot on flat ground", () => {
  const me = worm(0, 200),
    target = worm(1, 700);
  const plan = planTurn(
    base({
      me,
      worms: [me, target],
      difficulty: "veteran",
      random: () => 0.5,
    }),
  );
  expect(plan).not.toBeNull();
  expect(plan.score).toBeGreaterThan(20);
  expect(plan.angle).toBeGreaterThan(5);
  expect(plan.angle).toBeLessThan(175);
  expect(plan.power).toBeGreaterThanOrEqual(15);
  expect(plan.power).toBeLessThanOrEqual(100);
  expect(WEAPONS[plan.weapon]).toBeTruthy();
});

test("planner never spends a weapon with no ammo left", () => {
  const me = worm(0, 200),
    target = worm(1, 700);
  const plan = planTurn(
    base({
      me,
      worms: [me, target],
      ammo: { grenade: 0, mortar: 0, sticky: 0 },
      random: () => 0.5,
    }),
  );
  expect(plan.weapon).toBe("rocket");
});

test("planner prefers the heavy mortar for a cluster", () => {
  const me = worm(0, 200),
    worms = [me, worm(1, 700), worm(1, 742), worm(1, 764)];
  const plan = planTurn(
    base({ me, worms, difficulty: "veteran", random: () => 0.5 }),
  );
  expect(plan.weapon).toBe("mortar");
  expect(plan.score).toBeGreaterThan(80);
});

test("difficulty changes aim error but keeps the same solution", () => {
  const me = worm(0, 200),
    worms = [me, worm(1, 700)];
  // Zero makes the rookie's mistake check fire and applies the full negative jitter.
  const rookie = planTurn(
    base({ me, worms, difficulty: "rookie", random: () => 0 }),
  );
  const veteran = planTurn(
    base({ me, worms, difficulty: "veteran", random: () => 0 }),
  );
  expect(Math.abs(rookie.angle - rookie.baseAngle)).toBeCloseTo(6, 0);
  expect(Math.abs(veteran.angle - veteran.baseAngle)).toBeCloseTo(0.3, 1);
  expect(Math.abs(rookie.angle - rookie.baseAngle)).toBeGreaterThan(
    Math.abs(veteran.angle - veteran.baseAngle),
  );
});

test("repositioning walks away from the waterline on a slope", () => {
  const surface = (x) => 120 + x * 0.45;
  const slope = {
    solid: (x, y) => x >= 0 && x <= W && y < surface(x),
    surface,
  };
  const me = worm(0, 60, surface(60) + 12);
  const move = planMove({
    terrain: slope,
    me,
    waterLevel: 150,
    difficulty: "veteran",
    random: () => 0.1,
  });
  expect(move).toEqual({ direction: 1, time: 0.5 });
});

test("repositioning refuses a downhill walk that moves closer to the water", () => {
  const surface = (x) => 200 - x * 0.3;
  const downhill = {
    solid: (x, y) => x >= 0 && x <= W && y < surface(x),
    surface,
  };
  const me = { ...worm(0, 60, surface(60) + 12), ground: true };
  const move = planMove({
    terrain: downhill,
    me,
    waterLevel: 200,
    difficulty: "veteran",
    random: () => 0.1,
  });
  expect(move).toBeNull();
});

test("repositioning walks toward a nearby supply crate", () => {
  const me = worm(0, 200);
  const move = planMove({
    terrain: flat,
    me,
    waterLevel: WATER,
    difficulty: "veteran",
    crate: { x: 290, y: 312, kind: "health" },
    random: () => 0.1,
  });
  expect(move).not.toBeNull();
  expect(move.direction).toBe(1);
  expect(move.time).toBeGreaterThan(1);
});
