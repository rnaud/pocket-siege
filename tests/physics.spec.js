import { test, expect } from "@playwright/test";
import {
  shotGeometry,
  stepWorm,
  blastImpulse,
  walkWorm,
  bodyBlocked,
  hitsWorm,
  chargePower,
  reflectVelocity,
} from "../src/physics.js";
const empty = { solid: () => false };
const floor = { solid: (x, y) => y < 0 };
const worm = (x = 0, y = 10) => ({
  x,
  y,
  vx: 0,
  vy: 0,
  ground: false,
  knocked: false,
});
test("blast direction is radial, preserves momentum, and weaker with distance", () => {
  const a = worm(30, 100),
    b = worm(80, 100),
    below = worm(0, 40);
  a.vx = 20;
  blastImpulse(a, 0, 117, 130);
  blastImpulse(b, 0, 117, 130);
  blastImpulse(below, 0, 117, 130);
  expect(a.vx).toBeGreaterThan(b.vx);
  // Blasts add a little lift, so an even side hit still pops the worm upward.
  expect(a.vy).toBeGreaterThan(0);
  expect(below.vy).toBeLessThan(0);
  const left = worm(-30, 100);
  blastImpulse(left, 0, 117, 130);
  expect(left.vx).toBeLessThan(0);
});
test("side hits carry a worm well away from the blast", () => {
  const w = worm(100, 300);
  w.ground = true;
  const startX = w.x;
  blastImpulse(w, 60, 317, 87, 380);
  expect(w.vy).toBeGreaterThan(0);
  for (let i = 0; i < 180; i++) stepWorm(w, empty, 1 / 120);
  expect(w.x - startX).toBeGreaterThan(120);
});
test("airborne knockback follows gravity without horizontal drag or steering", () => {
  const w = worm(100, 300);
  w.vx = 100;
  w.vy = 80;
  w.knocked = true;
  for (let i = 0; i < 60; i++) stepWorm(w, empty, 1 / 120);
  expect(w.x).toBeCloseTo(150, 1);
  expect(w.vx).toBe(100);
  expect(w.vy).toBeCloseTo(7.5, 1);
  const x = w.x;
  expect(walkWorm(w, empty, 1, 0.1)).toBe(false);
  expect(w.x).toBe(x);
});
test("swept body rebounds from walls and ceilings without tunneling", () => {
  const terrain = { solid: (x, y) => x >= 100 || y >= 200 };
  const w = worm(30, 100);
  w.vx = 1000;
  w.knocked = true;
  for (let i = 0; i < 15; i++) stepWorm(w, terrain, 1 / 120);
  expect(w.x).toBeLessThan(83);
  expect(w.vx).toBeLessThan(0);
  expect(bodyBlocked(terrain, w.x, w.y)).toBe(false);
  const up = worm(0, 100);
  up.vy = 500;
  up.knocked = true;
  for (let i = 0; i < 20; i++) stepWorm(up, terrain, 1 / 120);
  expect(up.y).toBeLessThanOrEqual(156);
  expect(up.vy).toBeLessThan(0);
});
test("hard falls cause damage and settle; gentle landings do not", () => {
  const high = worm(0, 260),
    low = worm(50, 30);
  let highDamage = 0,
    lowDamage = 0;
  for (let i = 0; i < 900; i++) {
    highDamage += stepWorm(high, floor, 1 / 120).fallDamage;
    lowDamage += stepWorm(low, floor, 1 / 120).fallDamage;
  }
  expect(highDamage).toBeGreaterThan(0);
  expect(lowDamage).toBe(0);
  expect(high.ground).toBe(true);
  expect(high.vy).toBe(0);
  expect(high.y).toBeGreaterThanOrEqual(10);
});
test("contact friction stops sliding and projectile hits include the head", () => {
  const w = worm(0, 10);
  w.vx = 60;
  w.ground = true;
  w.knocked = true;
  for (let i = 0; i < 200; i++) stepWorm(w, floor, 1 / 120);
  expect(w.vx).toBe(0);
  expect(w.knocked).toBe(false);
  expect(hitsWorm(w, w.x, w.y + 40)).toBe(true);
  expect(hitsWorm(w, w.x, w.y + 55)).toBe(false);
});
test("charge power grows with hold duration, caps, and bounce reflects normal", () => {
  expect(chargePower(0.2)).toBe(10);
  expect(chargePower(1)).toBe(50);
  expect(chargePower(3)).toBe(100);
  const p = { vx: 80, vy: -100 };
  reflectVelocity(p, { x: 0, y: 1 }, 0.5);
  expect(p.vy).toBe(50);
  expect(p.vx).toBeLessThan(80);
});

test("shot origin is independent of viewport and sprite scale", () => {
  for (const angle of [-80, 0, 45, 90, 135, 230]) {
    const a = shotGeometry(worm(100, 100), angle, 1, 64);
    const b = shotGeometry(worm(100, 100), angle, 0.4, 96);
    expect(a.muzzle).toEqual(b.muzzle);
    expect(a.pivot).toEqual(b.pivot);
  }
});
