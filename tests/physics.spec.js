import { captureReplayEnvironment, restoreReplayEnvironment } from "../src/armageddon/replay-environment-adapter.js";
import { MatchRandom } from "../src/armageddon/random.js";
import { NativeGamePalette } from "../src/armageddon/game-palette.js";
import { test, expect } from "./helpers/shared-page.js";
import {
  Terrain,
  shotGeometry,
  stepWorm,
  blastImpulse,
  walkWorm,
  bodyBlocked,
  hitsWorm,
  chargePower,
  reflectVelocity,
  integrate,
  GRAVITY,
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
test("blast direction is radial, preserves momentum, and weaker with distance", { tag: "@logic" }, () => {
  const a = worm(30, 100),
    b = worm(80, 100),
    below = worm(0, 40);
  a.vx = 20;
  blastImpulse(a, 0, 100, 130);
  blastImpulse(b, 0, 100, 130);
  blastImpulse(below, 0, 100, 130);
  expect(a.vx).toBeGreaterThan(b.vx);
  // Blasts add a little lift, so an even side hit still pops the worm upward.
  expect(a.vy).toBeGreaterThan(0);
  expect(below.vy).toBeLessThan(0);
  const left = worm(-30, 100);
  blastImpulse(left, 0, 117, 130);
  expect(left.vx).toBeLessThan(0);
});
test("side hits carry a worm well away from the blast", { tag: "@logic" }, () => {
  const w = worm(100, 300);
  w.ground = true;
  const startX = w.x;
  blastImpulse(w, 60, 317, 87, 380);
  expect(w.vy).toBeGreaterThan(0);
  for (let i = 0; i < 180; i++) stepWorm(w, empty, 1 / 120);
  expect(w.x - startX).toBeGreaterThan(120);
});
test("airborne knockback follows gravity without horizontal drag or steering", { tag: "@logic" }, () => {
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
test("swept body rebounds from walls and ceilings without tunneling", { tag: "@logic" }, () => {
  const terrain = { solid: (x, y) => x >= 100 || y >= 200 };
  const w = worm(30, 100);
  w.vx = 1000;
  w.knocked = true;
  for (let i = 0; i < 15; i++) stepWorm(w, terrain, 1 / 120);
  expect(w.x).toBeLessThan(83);
  expect(w.vx).toBeLessThan(0);
  expect(bodyBlocked(terrain, w.x, w.y)).toBe(false);
  const up = worm(0, 150);
  up.vy = 500;
  up.knocked = true;
  for (let i = 0; i < 20; i++) stepWorm(up, terrain, 1 / 120);
  expect(up.y).toBeLessThan(192);
  expect(bodyBlocked(terrain, up.x, up.y)).toBe(false);
  expect(up.vy).toBeLessThan(0);
});
test("hard falls cause damage and settle; gentle landings do not", { tag: "@logic" }, () => {
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
  expect(high.y).toBeGreaterThan(6);
  expect(high.y).toBeLessThanOrEqual(7);
  expect(bodyBlocked(floor, high.x, high.y)).toBe(false);
  expect(bodyBlocked(floor, high.x, high.y - 1)).toBe(true);
});
test("contact friction stops sliding and projectile hits include the head", { tag: "@logic" }, () => {
  const w = worm(0, 10);
  w.vx = 60;
  w.ground = true;
  w.knocked = true;
  for (let i = 0; i < 200; i++) stepWorm(w, floor, 1 / 120);
  expect(w.vx).toBe(0);
  expect(w.knocked).toBe(false);
  expect(hitsWorm(w, w.x, w.y + 8)).toBe(true);
  expect(hitsWorm(w, w.x, w.y + 10)).toBe(false);
});
test("charge power grows with hold duration, caps, and bounce reflects normal", { tag: "@logic" }, () => {
  expect(chargePower(0.2)).toBe((8730 / 65536) * 100);
  expect(chargePower(1)).toBe((43650 / 65536) * 100);
  expect(chargePower(1.5)).toBe((65475 / 65536) * 100);
  expect(chargePower(1.52)).toBe(100);
  expect(chargePower(3)).toBe(100);
  const p = { vx: 80, vy: -100 };
  reflectVelocity(p, { x: 0, y: 1 }, 0.5);
  expect(p.vy).toBe(50);
  expect(p.vx).toBeLessThan(80);
});

test("shot origin is independent of viewport and sprite scale", { tag: "@logic" }, () => {
  for (const angle of [-80, 0, 45, 90, 135, 230]) {
    const a = shotGeometry(worm(100, 100), angle, 1, 64);
    const b = shotGeometry(worm(100, 100), angle, 0.4, 96);
    expect(a.muzzle).toEqual(b.muzzle);
    expect(a.pivot).toEqual(b.pivot);
  }
});

test("low gravity scales projectile and body gravity", { tag: "@logic" }, () => {
  const p = { x: 0, y: 0, vx: 0, vy: 0 };
  integrate(p, 1, 0, 0.5);
  expect(p.vy).toBeCloseTo(-GRAVITY * 0.5, 5);
});

test("landing reports impact speed before grounded velocity is cleared", { tag: "@logic" }, () => {
  const w = worm(0, 11);
  w.vy = -300;
  const result = stepWorm(w, floor, 1 / 50);
  expect(result.landed).toBe(true);
  expect(result.landingSpeed).toBeGreaterThan(300);
  expect(w.vy).toBe(0);
  expect(stepWorm(w, floor, 1 / 50).landingSpeed).toBe(0);
});

test("terrain craters remove solid ground and preserve distant terrain", { tag: "@logic" }, () => {
  const t = new Terrain(42),
    x = 400,
    y = t.surface(x) - 15;
  expect(t.solid(x, y)).toBe(true);
  const other = t.surface(800);
  expect(t.carve(x, y, 50)).toBeGreaterThan(1000);
  expect(t.solid(x, y)).toBe(false);
  expect(t.surface(800)).toBe(other);
  expect(t.carve(x, y, 50)).toBe(0);
  // Replay restoration must rewind both collision and painted terrain, while
  // preserving the objects held by collision/render adapters.
  const random = new MatchRandom(987), collision = t.data;
  t.pixels = new Uint8ClampedArray(1200 * 650 * 4);
  t.pixels.set([17, 23, 41, 255], 0);
  t.craterRim = new Uint8Array(1200 * 650); t.craterRim[5] = 1;
  t.nativePalette = new NativeGamePalette(137, 248);
  t.nativePalette.add([17, 23, 41]);
  const palette = t.nativePalette, pixels = t.pixels;
  const saved = captureReplayEnvironment(t, random, 1200, 650);
  const expectedRandom = [random.logicUint(), random.visualUint()];
  const removed = t.carve(800, other - 15, 40);
  t.pixels.fill(0); t.craterRim.fill(0);
  t.decorationPixels = new Uint8ClampedArray(1200 * 650 * 4);
  t.nativePalette.add([1, 2, 3]); random.finishFrame();
  let repainted = false;
  restoreReplayEnvironment(saved, t, random, 1200, 650, restored => {
    expect(restored).toBe(t); repainted = true;
  });
  expect(repainted).toBe(true);
  expect(t.data).toBe(collision); expect(t.pixels).toBe(pixels); expect(t.nativePalette).toBe(palette);
  expect([...t.pixels.slice(0, 4)]).toEqual([17, 23, 41, 255]);
  expect(t.craterRim[5]).toBe(1); expect(t.decorationPixels).toBeUndefined();
  expect(t.nativePalette.used).toHaveLength(1);
  expect([random.logicUint(), random.visualUint()]).toEqual(expectedRandom);
  expect(t.carve(800, other - 15, 40)).toBe(removed);
  restoreReplayEnvironment(saved, t, random, 1200, 650);
  expect(t.carve(800, other - 15, 40)).toBe(removed);
  const before = random.snapshot();
  expect(() => restoreReplayEnvironment({ ...saved, random: { ...saved.random, logic: -1 } }, t, random, 1200, 650)).toThrow(RangeError);
  expect(random.snapshot()).toEqual(before);
  expect(t.solid(800, other - 15)).toBe(false);

});
