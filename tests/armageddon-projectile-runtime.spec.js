import { test, expect } from "@playwright/test";
import {
  nativeProjectileLaunch,
  nativeProjectileLaunchGeometry,
  attachNativeProjectile,
  stepNativeProjectile,
  nativeProjectileDetonationEvents,
  nativeProjectileChildren,
  nativeProjectilePlacementHit,
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
test("live adapter uses native launch units, force defaults, and weapon wind coefficients", { tag: "@logic" }, () => {
  const rocket = projectile("rocket"),
    grenade = projectile("grenade");
  expect(rocket.vx).toBe(1200);
  expect(nativeProjectileLaunch("rocket", 0, 0).vx).toBe(0);
  expect(nativeProjectileLaunch("sticky", 0, 100)).toBeNull();
  const petrol = projectile("napalm", { fuse: 1 });
  expect(petrol.nativeDetonation).toMatchObject({ sprite: 664, damage: 15, push: 75, secondary: 2 });
  expect(petrol.nativeFire).toEqual({ count: 40, delay: 100, lifetime: 4000, persistent: 1 });
  expect(petrol.nativeTimer.remaining).toBe(9000);

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
test("live grenade consumes remaining movement after hitting a thin wall", { tag: "@logic" }, () => {
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
test("native projectile can skim water with the original shallow-angle response", { tag: "@logic" }, () => {
  const p = projectile("grenade", { x: 200, y: 79, vx: 600, vy: -50 });
  stepNativeProjectile(p, { ...environment, bounces: true }, () => 0);
  expect(p.y).toBeGreaterThan(80);
  expect(p.vy).toBeGreaterThan(0);
  expect(p.nativeBody.submerged).toBe(0);
});

test("resting native bodies sleep and periodically recheck removed support", { tag: "@logic" }, () => {
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

test("crossing the integer water boundary allows native skimming on the following tick", { tag: "@logic" }, () => {
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

test("live water transitions emit one splash and skimming emits its separate cue", { tag: "@logic" }, () => {
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

test("native contact masks detonate rockets and keep grenade contacts alive", { tag: "@logic" }, () => {
  for (const [kind, detonate] of [["rocket", true], ["grenade", false]]) {
    const p = projectile(kind, { x: 200, vx: 1200, vy: 0 });
    const result = stepNativeProjectile(p, environment, (x) => x >= 210 ? 1 : 0);
    expect(result.contacts).toBeGreaterThan(0);
    expect(result.detonate).toBe(detonate);
    expect(p.nativeBody.enabled).toBe(detonate ? 0 : 1);
    if (!detonate) expect(result.events.some(e => e.operation === "sound" && e.request[0] === 113)).toBe(true);
  }
});

test("grenade receiver dispatch updates a hurt worm instead of bouncing against zero velocity", { tag: "@logic" }, () => {
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

test("live fuse uses milliseconds and native next-tick expiration instead of host age", { tag: "@logic" }, () => {
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

test("resting holy grenade completes its native delay and queues one holy cue", { tag: "@logic" }, () => {
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

test("homing activates after 500ms and integrates native guidance for 3500ms", { tag: "@logic" }, () => {
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

test("native grenade visual progress follows body rotation instead of host age", { tag: "@logic" }, () => {
  const p = projectile("grenade", { age: 50, vx: 200, vy: 0 });
  stepNativeProjectile(p, environment, () => 0);
  expect(p.nativeRender.sprite).toBe(653);
  expect(p.nativeRender.progress).toBe(p.nativeBody.angle);
  expect(p.nativeRender.progress).not.toBe(0);
});

test("native lifetime preserves long flights outside the browser map and removes bodies at native depth", { tag: "@logic" }, () => {
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

test("native far-distance limit detonates while active homing receives its extra depth", { tag: "@logic" }, () => {
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

test("projectile timed animation advances once per simulation tick using launch-derived rate", { tag: "@logic" }, () => {
  const p = projectile("grenade", { vx: 0, vy: 0 });
  p.nativeBody.gravityScale = 0;
  p.nativeArt.primary.mode = 4;
  p.nativeArt.progress = 65535;
  const rate = p.nativeArt.rate;
  stepNativeProjectile(p, environment, () => 0);
  expect(p.nativeRender.progress).toBe(65535 + Math.trunc(rate / 100));
  stepNativeProjectile(p, environment, () => 0);
  expect(p.nativeRender.progress).toBe(65535 + 2 * Math.trunc(rate / 100));
  expect(p.nativeArt.rate).toBe(rate);
});


test("live native projectile blast packets use scheme strength, push and vertical offsets", { tag: "@logic" }, () => {
  const expected = {
    rocket: [0, 100, 50], homing: [1, 100, 50], mortar: [0, 0, 15],
    grenade: [2, 100, 50], cluster: [0, 0, 20], holy: [37, 125, 100],
  };
  for (const [kind, [offset, push, strength]] of Object.entries(expected)) {
    const p = projectile(kind);
    let draws = 0;
    const events = nativeProjectileDetonationEvents(p, () => { draws++; return 42; });
    expect(events.find(e => e.operation === "blast").request).toEqual([
      1, p.nativeBody.x, p.nativeBody.y + offset * 65536, push, strength, 1,
    ]);
    expect(draws).toBe(1);
    expect(events.some(e => e.operation === "fragments")).toBe(["cluster", "mortar"].includes(kind));
  }
});


test("cluster and mortar emit five native secondary bodies with separate blast records", { tag: "@logic" }, () => {
  for (const kind of ["cluster", "mortar"]) {
    const p = projectile(kind);
    let draws = 0;
    const children = nativeProjectileChildren(p, 650, () => { draws++; return 32768; });
    expect(children).toHaveLength(5);
    expect(draws).toBe(10);
    for (const [i, child] of children.entries()) {
      expect(child.nativeRepeat).toBe(i + 1);
      expect(child.nativeBody.sprite).toBe(659);
      expect(child.nativeBody.mode).toBe(2);
      expect(child.nativeDetonation.damage).toBe(kind === "cluster" ? 20 : 15);
      expect(child.nativeDetonation.push).toBe(100);
      expect(nativeProjectileChildren(child, 650, () => { throw Error("Recursive fragment emission"); })).toEqual([]);
      const before = child.y;
      stepNativeProjectile(child, environment, () => 0);
      expect(child.y).not.toBe(before);
    }
  }
});


test("native placement rejects terrain at spawn instead of excluding its initial overlap", { tag: "@logic" }, () => {
  const p = projectile("cluster", { x: 200, y: 400 });
  const terrain = { solid: (x,y) => x >= 195 && x <= 205 && y >= 395 && y <= 405 };
  expect(nativeProjectilePlacementHit(p, terrain, [], 650)).toBe(1);
  const clear = projectile("cluster", { x: 220, y: 400 });
  expect(nativeProjectilePlacementHit(clear, terrain, [], 650)).toBe(0);
});

test("secondary construction runs between random draws for successive fragments", { tag: "@logic" }, () => {
  const p = projectile("cluster");
  const order = [];
  nativeProjectileChildren(p, 650, () => { order.push("random"); return 42; },
    child => order.push(child.nativeRepeat));
  expect(order).toEqual(["random","random",1,"random","random",2,"random","random",3,"random","random",4,"random","random",5]);
});


test("native live launch geometry uses body-origin throws and fourteen-pixel rocket offsets", { tag: "@logic" }, () => {
  const worm = { x: 200, y: 400 };
  for (const kind of ["rocket", "homing", "mortar", "grenade", "cluster", "holy"]) {
    for (const angle of [-180,-90,0,90,180]) {
      let draws = 0;
      const fired = nativeProjectileLaunchGeometry(kind,worm,angle,100,650,() => { draws++; return 42; });
      const preview = nativeProjectileLaunchGeometry(kind,worm,angle,100,650,() => { throw Error("Preview consumed RNG"); },true);
      expect(fired).toEqual(preview);
      expect(draws).toBe(1);
      const distance = ["rocket","homing","mortar"].includes(kind) ? 14 : 0;
      expect(fired.x).toBeCloseTo(worm.x + distance * Math.cos(angle * Math.PI / 180),4);
      expect(fired.y).toBeCloseTo(worm.y + distance * Math.sin(angle * Math.PI / 180),4);
      expect(fired.vx).toBeCloseTo(1200 * Math.cos(angle * Math.PI / 180),4);
      expect(fired.vy).toBeCloseTo(1200 * Math.sin(angle * Math.PI / 180),4);
    }
  }
});

test("native super banana detonates into five repeat-guarded bomblets", { tag: "@logic" }, () => {
  const banana = projectile("superbanana", { x: 200, y: 400 });
  expect(banana.nativeDetonation).toMatchObject({
    sprite: 662, damage: 75, push: 100, secondary: 1,
  });
  expect(banana.nativeFragmentConfig).toMatchObject({
    count: 5, speed: 45, variance: 30, direction: 0, spread: 25,
  });
  expect(nativeProjectileDetonationEvents(banana, () => 0).some(
    (event) => event.operation === "fragments",
  )).toBe(true);
  const children = nativeProjectileChildren(banana, 650, () => 12345);
  expect(children).toHaveLength(5);
  expect(children.map((child) => child.nativeRepeat)).toEqual([1, 2, 3, 4, 5]);
  expect(children.every((child) => child.nativeDetonation.secondary === 1)).toBe(true);
  expect(children.every((child) => nativeProjectileChildren(child, 650, () => 0).length === 0)).toBe(true);
});

test("native ming vase detonates into three repeat-guarded shards", { tag: "@logic" }, () => {
  const vase = projectile("mingvase", { x: 200, y: 400 });
  expect(vase.nativeDetonation).toMatchObject({
    sprite: 668, damage: 75, push: 100, secondary: 1,
  });
  expect(vase.nativeFragmentConfig).toMatchObject({
    count: 3, speed: 40, variance: 30, direction: 0, spread: 25,
  });
  const events = nativeProjectileDetonationEvents(vase, () => 0);
  expect(events.some((event) => event.operation === "sound" && event.request[0] === 64)).toBe(true);
  expect(events.some((event) => event.operation === "fragments")).toBe(true);
  const children = nativeProjectileChildren(vase, 650, () => 12345);
  expect(children).toHaveLength(3);
  expect(children.map((child) => child.nativeRepeat)).toEqual([1, 2, 3]);
  expect(children.every((child) => nativeProjectileChildren(child, 650, () => 0).length === 0)).toBe(true);
});

test("native sheep uses the slot-23 walking-bomb record", { tag: "@logic" }, () => {
  const sheep = projectile("sheep", { x: 200, y: 400, fuse: 2 });
  expect(sheep.nativeBody).toMatchObject({ sprite: 626, mode: 3 });
  expect(sheep.nativeTimer.remaining).toBe(20000);
  expect(sheep.nativeDetonation).toMatchObject({
    sprite: 626, damage: 75, push: 100, offset: 50, secondary: 0,
  });
});

test("native donkey uses the slot-54 released-unit record", { tag: "@logic" }, () => {
  const donkey = projectile("donkey", { x: 200, y: 400, fuse: 2 });
  expect(donkey.nativeBody).toMatchObject({ sprite: 644, mode: 2 });
  expect(donkey.nativeTimer.remaining).toBe(16000);
  expect(donkey.nativeDetonation).toMatchObject({
    sprite: 644, damage: 100, push: 100, offset: 100, secondary: 0,
  });
});

test("native super and aqua sheep share the slot-24/25 walking-bomb record", { tag: "@logic" }, () => {
  for (const kind of ["supersheep", "aquasheep"]) {
    const sheep = projectile(kind, { x: 200, y: 400, fuse: 2 });
    expect(sheep.nativeBody).toMatchObject({ sprite: 626, mode: 3 });
    expect(sheep.nativeTimer.remaining).toBe(20000);
    expect(sheep.nativeDetonation).toMatchObject({
      sprite: 626, damage: 75, push: 100, offset: 50,
    });
  }
});

test("native old woman uses the slot-53 released-unit record", { tag: "@logic" }, () => {
  const woman = projectile("oldwoman", { x: 200, y: 400, fuse: 2 });
  expect(woman.nativeBody).toMatchObject({ sprite: 617, mode: 3 });
  expect(woman.nativeTimer.remaining).toBe(5000);
  expect(woman.nativeDetonation).toMatchObject({
    sprite: 617, damage: 75, push: 100, offset: 50,
  });
});

test("native sally army, skunk and mad cow use their recovered unit payloads", { tag: "@logic" }, () => {
  for (const [kind, sprite, timer, damage, secondary] of [
    ["sallyarmy", 616, 10000, 75, 1],
    ["skunk", 618, 5000, 0, 1],
    ["madcow", 614, 10000, 75, 0],
  ]) {
    const unit = projectile(kind, { x: 200, y: 400, fuse: 2 });
    expect(unit.nativeBody).toMatchObject({ sprite, mode: 3 });
    expect(unit.nativeTimer.remaining).toBe(timer);
    expect(unit.nativeDetonation).toMatchObject({ sprite, damage, secondary });
  }
});

test("native mole bomb uses the recovered slot-26 payload", { tag: "@logic" }, () => {
  const mole = projectile("molebomb", { x: 200, y: 400, fuse: 2 });
  expect(mole.nativeBody).toMatchObject({ sprite: 620, mode: 3 });
  expect(mole.nativeTimer.remaining).toBe(10000);
  expect(mole.nativeDetonation).toMatchObject({
    sprite: 620, damage: 0, push: 100, secondary: 1,
  });
});

test("native MB bomb uses the recovered slot-46 payload", { tag: "@logic" }, () => {
  const bomb = projectile("mbbomb", { x: 200, y: 400, fuse: 2 });
  expect(bomb.nativeBody).toMatchObject({ sprite: 680, mode: 2 });
  expect(bomb.nativeTimer.remaining).toBe(9000);
  expect(bomb.nativeDetonation).toMatchObject({
    sprite: 680, damage: 100, push: 100, offset: 0,
  });
});
