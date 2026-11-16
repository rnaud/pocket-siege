import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/projectile-overlap.json" with { type: "json" };
import {
  attachNativeProjectile,
  nativeProjectileCollision,
} from "../src/armageddon/projectile-runtime.js";

test("native projectile types retain their original constructor mask", () => {
  for (const kind of [
    "rocket",
    "homing",
    "mortar",
    "grenade",
    "cluster",
    "holy",
  ]) {
    const p = {
      kind,
      owner: 99,
      x: 20,
      y: 30,
      vx: 100,
      vy: 0,
      fuse: 3,
      bounce: 0.55,
    };
    expect(attachNativeProjectile(p, 48)).toBe(true);
    expect(p.nativeBody.shape).toBe(2);
  }
});

test("live projectile terrain and worm masks match original overlap", () => {
  const terrains = fixture.terrains.slice(0, 6).map((t) => {
    const pixels = new Set(t.planes[0].points.map(([x, y]) => y * t.width + x));
    return {
      solid(x, y) {
        x = Math.floor(x);
        y = 47 - Math.floor(y);
        return (
          x >= 0 &&
          x < t.width &&
          y >= 0 &&
          y < t.height &&
          pixels.has(y * t.width + x)
        );
      },
    };
  });
  const empty = { solid: () => false };
  // Start clear of every fixture target so registry priming excludes none.
  const p = {
    nativeBody: { shape: 2, flags: 6, x: 1000 << 16, y: 1000 << 16 },
    owner: 99,
  };
  for (const r of fixture.cases) {
    const wormTarget = r.pattern === 6;
    const result = nativeProjectileCollision(
      p,
      r.x,
      48 - r.y,
      wormTarget ? empty : terrains[r.pattern],
      wormTarget ? [{ x: 0, y: 48, hp: 100 }] : [],
      48,
    );
    expect(result, JSON.stringify(r)).toBe(r.result ? (wormTarget ? 2 : 1) : 0);
  }
});
