import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/homing-avoidance.json" with { type: "json" };
import { nativeHomingAvoid } from "../src/armageddon/homing.js";

test("pigeon terrain queries and obstacle steering match the original executable", () => {
  expect(fixture.cases).toHaveLength(480);
  for (const [index, row] of fixture.cases.entries()) {
    const queries = [];
    const result = nativeHomingAvoid(row.body, (x, y) => {
      const hit = row.rectangles.some(([l, b, r, t]) => x >= l && x <= r && y >= b && y <= t);
      queries.push([x, y, Number(hit)]);
      return hit;
    });
    expect(queries, `queries ${index}`).toEqual(row.queries);
    expect(result, `velocity ${index}`).toEqual(row.output);
  }
});

import { attachNativeProjectile, stepNativeProjectile } from "../src/armageddon/projectile-runtime.js";

test("pigeon uses original delay, avoidance, trail and damage in the live adapter", () => {
  const p = { kind: "pigeon", x: 200, y: 400, vx: 200, vy: 0, fuse: 3, bounce: 0.55, target: { x: 800, y: 400 } };
  attachNativeProjectile(p, 650);
  expect(p.nativeGuidance).toMatchObject({ kind: 2, delay: 505, duration: 4540 });
  expect(p.nativeDetonation).toMatchObject({ damage: 75, push: 100, offset: 25 });
  p.nativeBody.gravityScale = 0;
  let queries = 0;
  const environment = { height: 650, waterLevel: -10000, solid: () => { queries++; return true; } };
  for (let frame = 1; frame <= 26; frame++) {
    const result = stepNativeProjectile(p, { ...environment, frame }, () => 0);
    expect(result.events.some(e => e.guidance && e.operation === "avoid")).toBe(false);
  }
  expect(queries).toBe(0);
  const result = stepNativeProjectile(p, { ...environment, frame: 27 }, () => 0);
  expect(result.events.filter(e => e.guidance).map(e => e.operation)).toEqual(["steer", "avoid"]);
  expect(queries).toBeGreaterThan(0);
  expect(p.nativeGuidance.duration).toBe(4520);
  expect(p.nativeTrail.fields[0]).toBe(813);
  expect(p.nativeRender.sprite).toBeGreaterThanOrEqual(628);
  expect(p.nativeRender.sprite).toBeLessThanOrEqual(631);
});

test("live pigeon targets, launches with original art and spends one ammo", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#inventory-toggle").click();
  await page.locator("#special-toggle").click();
  await page.locator('[data-weapon="pigeon"]').click();
  await page.locator("#fire").click();
  expect(await page.evaluate(() => window.siege.getState().targetUtility)).toBe("pigeon");
  const scene = page.locator("#scene");
  const box = await scene.boundingBox();
  await scene.dispatchEvent("pointerdown", { clientX: box.x + box.width * 0.65, clientY: box.y + box.height * 0.3, pointerId: 1 });
  await expect.poll(() => page.evaluate(() => window.siege.getState().homingTarget)).not.toBeNull();
  const target = await page.evaluate(() => window.siege.getState().homingTarget);
  await page.locator("#angle").fill("90");
  await page.locator("#angle").dispatchEvent("input");
  await page.locator("#fire").dispatchEvent("pointerdown", { pointerId: 2 });
  await page.waitForTimeout(500);
  await page.locator("#fire").dispatchEvent("pointerup", { pointerId: 2 });
  await expect.poll(() => page.evaluate(() => window.siege.getState().projectile?.kind)).toBe("pigeon");
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.projectile.sprite).toMatch(/^pigeonr[0-3]$/);
  expect(state.projectile.target).toEqual(target);
  expect(state.ammo[0].pigeon).toBe(0);
  await expect.poll(() => page.evaluate(() => window.siege.getState().projectile?.nativeGuidance?.initialized)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.siege.getState().projectile), { timeout: 15000 }).toBeNull();
});

test("pigeon flight artwork switches through all four speed strips and faces left", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const frames = await page.evaluate(async () => {
    const art = await import('/src/armageddon/art.js');
    const mesh = art.createOriginalVisual('pigeonr0');
    return [0, 3, 1, 2, 0].map(i => {
      const updated = art.updateOriginalProjectile(mesh, 'pigeon', -100, 0, 1, false, true,
        { sprite: 628 + i, progress: 32768, facing: -1 });
      return { updated, sprite: mesh.userData.originalSprite, facing: Math.sign(mesh.scale.x) };
    });
  });
  expect(frames).toEqual([0, 3, 1, 2, 0].map(i => ({ updated: true, sprite: `pigeonr${i}`, facing: -1 })));
});
