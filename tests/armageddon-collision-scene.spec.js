import { test, expect } from "./helpers/shared-page.js";
import {
  nativeProjectileCollision,
  attachNativeProjectile,
  stepNativeProjectile,
} from "../src/armageddon/projectile-runtime.js";

const height = 100;
function projectile(x = 0, y = 20) {
  const p = {
    kind: "grenade",
    owner: 0,
    x,
    y,
    vx: 100,
    vy: 0,
    fuse: 3,
    bounce: 0.55,
  };
  attachNativeProjectile(p, height);
  return p;
}

test("native overlap exclusion ends on actor movement, not owner age", { tag: "@logic" }, () => {
  const p = projectile(),
    terrain = { solid: () => false };
  const worms = [{ x: 0, y: 20, hp: 100 }];
  expect(nativeProjectileCollision(p, 1, 20, terrain, worms, height)).toBe(0);
  p.nativeBody.x = 20 << 16;
  // The owner can now be struck immediately, even with a new projectile.
  expect(nativeProjectileCollision(p, 0, 20, terrain, worms, height)).toBe(2);
});

test("native flags select terrain or worm types in native order", { tag: "@logic" }, () => {
  const p = projectile(),
    terrain = { solid: (x) => x >= 10 };
  const worms = [{ x: 12, y: 20, hp: 100 }];
  for (const [flags, hit] of [
    [2, 1],
    [4, 2],
    [6, 1],
    [0, 0],
  ]) {
    p.nativeBody.flags = flags;
    expect(nativeProjectileCollision(p, 12, 20, terrain, worms, height)).toBe(
      hit,
    );
  }
});

test("native terrain overlap marker excludes the bitmap until the actor moves clear", { tag: "@logic" }, () => {
  const p = projectile(),
    terrain = { solid: (x) => x === 0 || x === 20 };
  p.nativeBody.flags = 2;
  expect(nativeProjectileCollision(p, 20, 20, terrain, [], height)).toBe(0);
  p.nativeBody.x = 10 << 16;
  expect(nativeProjectileCollision(p, 20, 20, terrain, [], height)).toBe(1);
});

test("registry membership refresh and disabled worms preserve contact identities", { tag: "@logic" }, () => {
  const p = projectile(),
    terrain = { solid: () => false };
  const first = { x: 20, y: 20, hp: 0 },
    second = { x: 20, y: 20, hp: 100 };
  expect(
    nativeProjectileCollision(p, 20, 20, terrain, [first, second], height),
  ).toBe(3);
  first.hp = 100;
  expect(
    nativeProjectileCollision(p, 20, 20, terrain, [first, second], height),
  ).toBe(2);
  expect(nativeProjectileCollision(p, 20, 20, terrain, [second], height)).toBe(
    2,
  );
  // A worm at 0 health keeps its body until its task is deleted.
  const doomed = { x: 20, y: 20, hp: 0, deathPending: true };
  // A fresh scene: registry rows keep registration order, not worm order.
  const fresh = projectile(), field = { solid: () => false };
  expect(nativeProjectileCollision(fresh, 20, 20, field, [doomed, second], height)).toBe(2);
  doomed.deathPending = false;
  doomed.dying = 0.5;
  expect(nativeProjectileCollision(fresh, 20, 20, field, [doomed, second], height)).toBe(2);
  doomed.dying = 0;
  expect(nativeProjectileCollision(fresh, 20, 20, field, [doomed, second], height)).toBe(3);
  second.nativeLaunching = true;
  expect(nativeProjectileCollision(fresh, 20, 20, field, [doomed, second], height)).toBe(0);
});

test("projectile collision callbacks see the current body after the first sweep", { tag: "@logic" }, () => {
  const p = projectile(2, 40);
  p.vx = 1200;
  const origins = [];
  stepNativeProjectile(
    p,
    { height, waterLevel: 0, frame: 1, bounces: true },
    (x, y, body) => {
      origins.push(body.x);
      return Math.floor(x) === 10 ? 1 : 0;
    },
  );
  expect(origins).toContain(2 << 16);
  expect(origins.some((x) => x !== 2 << 16)).toBe(true);
  expect(p.vx).toBeLessThan(0);
});

test("worm state changes move registry categories and invalidate overlap caching", { tag: "@logic" }, () => {
  const p = projectile(), terrain = { solid: () => false };
  const target = { x: 20, y: 20, hp: 100 };
  for (const [state, type] of [[0x65,2],[0x80,3],[0x79,4],[0x73,5],[0x88,6],[0x65,2]]) {
    target.nativeHurtBody = { state };
    for (let selected = 2; selected <= 6; selected++) {
      p.nativeBody.flags = 1 << selected;
      expect(nativeProjectileCollision(p,20,20,terrain,[target],height)).toBe(selected === type ? 2 : 0);
    }
  }
});
