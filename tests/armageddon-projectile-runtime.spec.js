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

test("native contact masks detonate rockets and keep grenade contacts alive", () => {
  for (const [kind, detonate] of [["rocket", true], ["grenade", false]]) {
    const p = projectile(kind, { x: 200, vx: 1200, vy: 0 });
    const result = stepNativeProjectile(p, environment, (x) => x >= 210 ? 1 : 0);
    expect(result.contacts).toBeGreaterThan(0);
    expect(result.detonate).toBe(detonate);
    expect(p.nativeBody.enabled).toBe(detonate ? 0 : 1);
    if (!detonate) expect(result.events.some(e => e.operation === "sound" && e.request[0] === 113)).toBe(true);
  }
});

test("grenade receiver dispatch updates a hurt worm instead of bouncing against zero velocity", () => {
  const p = projectile("grenade", { x: 200, vx: 600, vy: 0 });
  let other = { worm: true, type: 3, state: 0x80, mass: 65536, tangent: 65536, vx: 0, vy: 0 };
  let updates = 0;
  const result = stepNativeProjectile(p, {
    ...environment,
    collisionBody: () => other,
    updateCollisionBody: (hit, value) => { expect(hit).toBe(2); other = value; updates++; },
  }, x => x >= 205 ? 2 : 0);
  expect(updates).toBeGreaterThan(0);
  expect(other.vx).toBeGreaterThan(0);
  expect(p.vx).toBeGreaterThan(0);
  expect(p.vx).toBeLessThan(600);
  expect(result.detonate).toBe(false);
});

test("live fuse uses milliseconds and native next-tick expiration instead of host age", () => {
  const p = projectile("grenade", { fuse: 3, vx: 0, vy: 0, age: 999 });
  p.nativeBody.gravityScale = 0;
  expect(p.nativeTimer.remaining).toBe(3000);
  for (let frame = 1; frame <= 150; frame++) {
    const result = stepNativeProjectile(p, { ...environment, frame }, () => 0);
    expect(result.detonate).toBe(false);
  }
  expect(p.nativeTimer.remaining).toBe(0);
  expect(stepNativeProjectile(p, { ...environment, frame: 151 }, () => 0).detonate).toBe(true);
});

test("resting holy grenade completes its native delay and queues one holy cue", () => {
  const p = projectile("holy", { vx: 0, vy: 0 });
  p.nativeBody.gravityScale = 0;
  const sounds = p.nativeRelease.calls.filter(e => e.operation === "sound");
  for (let frame = 1; frame <= 240; frame++) {
    const result = stepNativeProjectile(p, { ...environment, frame }, () => 0);
    sounds.push(...result.events.filter(e => e.timer && e.operation === "sound"));
    expect(result.detonate).toBe(false);
  }
  expect(sounds.map(s => s.request)).toEqual([[73,3,65536,65536,0], [104,4,65536,65536,0]]);
  expect(stepNativeProjectile(p, { ...environment, frame: 241 }, () => 0).detonate).toBe(true);
});

test("homing activates after 500ms and integrates native guidance for 3500ms", () => {
  const p = projectile("homing", { vx: 200, vy: 0, target: { x: 400, y: 500 } });
  p.nativeBody.gravityScale = 0;
  for (let frame = 1; frame <= 25; frame++) {
    const result = stepNativeProjectile(p, { ...environment, waterLevel: -10000, frame }, () => 0);
    expect(result.events.some(e => e.guidance && e.operation === "steer")).toBe(false);
    expect(Math.abs(p.vy)).toBe(0);
  }
  expect(p.nativeGuidance.delay).toBe(0);
  expect(p.nativeTrail.fields[0]).toBe(0);
  const first = stepNativeProjectile(p, { ...environment, waterLevel: -10000, frame: 26 }, () => 0);
  expect(first.events).toContainEqual({ operation: "steer", guidance: true });
  expect(p.vy).toBeGreaterThan(0);
  expect(p.nativeGuidance.duration).toBe(3480);
  expect(p.nativeTrail.fields[0]).toBe(810);
  for (let frame = 27; frame <= 200; frame++)
    stepNativeProjectile(p, { ...environment, waterLevel: -10000, frame }, () => 0);
  expect(p.nativeGuidance.duration).toBe(0);
  expect(p.nativeTrail.fields[0]).toBe(0);
  expect(p.nativeGuidance.initialized).toBe(0);
  const last = stepNativeProjectile(p, { ...environment, waterLevel: -10000, frame: 201 }, () => 0);
  expect(last.events.some(e => e.guidance && e.operation === "steer")).toBe(false);
});

test("native grenade visual progress follows body rotation instead of host age", () => {
  const p = projectile("grenade", { age: 50, vx: 200, vy: 0 });
  stepNativeProjectile(p, environment, () => 0);
  expect(p.nativeRender.sprite).toBe(653);
  expect(p.nativeRender.progress).toBe(p.nativeBody.angle);
  expect(p.nativeRender.progress).not.toBe(0);
});

test("native lifetime preserves long flights outside the browser map and removes bodies at native depth", () => {
  const p = projectile("holy", { x: -60, y: 300, vx: 0, vy: 0, age: 13 });
  p.nativeBody.gravityScale = 0;
  p.nativeTimer.remaining = 1000;
  let result = stepNativeProjectile(p, environment, () => 0);
  expect(result.removed).toBe(false);
  expect(result.detonate).toBe(false);
  // Water is native y570: the minimum camera depth is768, plus40.
  p.y = 650 - 808;
  result = stepNativeProjectile(p, environment, () => 0);
  expect(result.removed).toBe(true);
  expect(result.detonate).toBe(false);
  expect(result.events).toContainEqual({ operation: "delete", request: [1], lifetime: true });
});

test("native far-distance limit detonates while active homing receives its extra depth", () => {
  const p = projectile("rocket", { x: 13460, y: 400, vx: 0, vy: 0 });
  p.nativeBody.gravityScale = 0;
  expect(stepNativeProjectile(p, environment, () => 0).detonate).toBe(true);
  const homing = projectile("homing", { x: 200, y: 650 - 808, vx: 0, vy: 0 });
  homing.nativeBody.gravityScale = 0;
  homing.nativeGuidance.initialized = 1;
  expect(stepNativeProjectile(homing, environment, () => 0).removed).toBe(false);
  homing.y = 650 - 936;
  expect(stepNativeProjectile(homing, environment, () => 0).removed).toBe(true);
});
