import { test, expect } from "@playwright/test";
import {
  nativeProjectileLaunch,
  attachNativeProjectile,
  stepNativeProjectile,
} from "../src/armageddon/projectile-runtime.js";
const environment = {
  height: 650,
  waterLevel: 80,
  gravityScale: 1,
  wind: 0,
  frame: 1,
};
const projectile = (kind, overrides = {}) => {
  const p = {
    kind,
    x: 200,
    y: 400,
    age: 0,
    fuse: 3,
    bounce: 0.55,
    ...nativeProjectileLaunch(kind, 0, 100),
    ...overrides,
  };
  attachNativeProjectile(p, 650);
  return p;
};
test("live adapter uses native launch units, force defaults, and weapon wind coefficients", () => {
  const rocket = projectile("rocket"),
    grenade = projectile("grenade");
  expect(rocket.vx).toBe(1200);
  expect(nativeProjectileLaunch("rocket", 0, 0).vx).toBe(0);
  expect(nativeProjectileLaunch("sticky", 0, 100)).toBeNull();
  stepNativeProjectile(rocket, { ...environment, wind: 50 }, () => 0);
  stepNativeProjectile(
    grenade,
    { ...environment, wind: 50, bounces: true },
    () => 0,
  );
  expect(grenade.x).toBe(224);
  expect(grenade.y).toBe(400 - 0x3d70 / 65536);
  expect(grenade.vy).toBe((-0x3d70 / 65536) * 50);
  expect(rocket.vx).toBeGreaterThan(grenade.vx);
  expect(grenade.nativeBody.restitutionY).toBe(Math.trunc((55 * 65536) / 100));
  expect(grenade.nativeBody.tangent).toBe(Math.trunc((96 * 65536) / 100));
});
test("live grenade consumes remaining movement after hitting a thin wall", () => {
  const p = projectile("grenade", { x: 2, y: 400 });
  const result = stepNativeProjectile(
    p,
    { ...environment, bounces: true },
    (x) => (Math.floor(x) === 10 ? 41 : 0),
  );
  expect(result.hit).toBe(41);
  expect(result.contacts).toBe(1);
  expect(p.vx).toBeLessThan(0);
  expect(p.x).toBeLessThan(2);
});
test("native projectile can skim water with the original shallow-angle response", () => {
  const p = projectile("grenade", { x: 200, y: 79, vx: 600, vy: -50 });
  stepNativeProjectile(p, { ...environment, bounces: true }, () => 0);
  expect(p.y).toBeGreaterThan(80);
  expect(p.vy).toBeGreaterThan(0);
  expect(p.nativeBody.submerged).toBe(0);
});

test("resting native bodies sleep and periodically recheck removed support", () => {
  const p = projectile("grenade", { x: 200, y: 300, vx: 0, vy: 0 });
  stepNativeProjectile(p, { ...environment, bounces: true }, (x, y) =>
    y < 300 ? 1 : 0,
  );
  expect(p.nativeBody.sleeping).toBe(1);
  stepNativeProjectile(p, { ...environment, frame: 2, bounces: true }, () => 0);
  expect(p.y).toBe(300);
  stepNativeProjectile(
    p,
    { ...environment, frame: 13, bounces: true },
    () => 0,
  );
  expect(p.y).toBeLessThan(300);
  expect(p.nativeBody.sleeping).toBe(0);
});

test("crossing the integer water boundary allows native skimming on the following tick", () => {
  const p = projectile("grenade", { x: 200, y: 80.5, vx: 600, vy: -50 });
  stepNativeProjectile(p, { ...environment, bounces: true }, () => 0);
  expect(p.y).toBeLessThan(80);
  expect(p.nativeBody.submerged).toBe(0);
  stepNativeProjectile(p, { ...environment, frame: 2, bounces: true }, () => 0);
  expect(p.y).toBeLessThan(79);
  expect(p.nativeBody.submerged).toBe(0);
  stepNativeProjectile(p, { ...environment, frame: 3, bounces: true }, () => 0);
  expect(p.y).toBeGreaterThan(80);
  expect(p.vy).toBeGreaterThan(0);
});

test("live water transitions emit one splash and skimming emits its separate cue", () => {
  const sinking = projectile("grenade", { y: 78, vx: 0, vy: -100 });
  const first = stepNativeProjectile(
    sinking,
    { ...environment, bounces: true },
    () => 0,
  );
  expect(first.sounds).toHaveLength(1);
  expect(first.sounds[0][0]).toBe(0x39);
  const second = stepNativeProjectile(
    sinking,
    { ...environment, frame: 2, bounces: true },
    () => 0,
  );
  expect(second.sounds).toEqual([]);
  const skimming = projectile("grenade", { y: 78, vx: 600, vy: -50 });
  const skim = stepNativeProjectile(
    skimming,
    { ...environment, bounces: true },
    () => 0,
  );
  expect(skim.sounds).toEqual([[0x3a, 0, 65536, 65536, 0]]);
});
