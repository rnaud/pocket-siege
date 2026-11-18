import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/airstrike.json" with { type: "json" };
import {
  nativeAirstrikeInitial,
  nativeAirstrikeTick,
} from "../src/armageddon/airstrike.js";

test("airstrike approach and missile payloads match the original aircraft task", { tag: "@logic" }, () => {
  expect(fixture.initial).toHaveLength(16);
  expect(fixture.cases).toHaveLength(1920);
  for (const c of fixture.initial)
    expect(nativeAirstrikeInitial(c.body, c.gravity)).toMatchObject({
      x: c.x,
      y: c.y,
      threshold: c.threshold,
    });
  for (const [i, c] of fixture.cases.entries()) {
    const payload = [
      123,
      2,
      0,
      0,
      0,
      0,
      c.config.targetX,
      c.config.targetY,
      0,
      55,
      3000,
    ];
    expect(
      nativeAirstrikeTick(c.before, c.config, payload),
      `case ${i}`,
    ).toEqual({ body: c.after, calls: c.calls });
  }
});

import {
  createNativeAirstrike,
  stepNativeAirstrike,
} from "../src/armageddon/projectile-runtime.js";
for (const [kind, carrierId, spriteId, damage, push, offset, timer] of [["airstrike", 673, 649, 30, 115, 50, 9000], ["postal", 675, 651, 50, 100, 0, 20000]])
test(`live ${kind} adapter releases five original missile bodies on consecutive ticks`, { tag: "@logic" }, () => {
  for (const direction of [-1, 1]) {
    const strike = createNativeAirstrike(600, 300, direction, 0, 650, 1, kind);
    expect(strike.sprite).toBe(carrierId);
    expect(strike.sound).toBe(52);
    const missiles = [],
      ticks = [];
    let removed = false;
    for (let tick = 0; tick < 200 && !removed; tick++) {
      const result = stepNativeAirstrike(strike, 650);
      missiles.push(...result.missiles);
      if (result.missiles.length) ticks.push(tick);
      removed = result.removed;
    }
    expect(removed).toBe(true);
    expect(missiles).toHaveLength(5);
    expect(ticks.slice(1)).toEqual(ticks.slice(0, -1).map((t) => t + 1));
    for (const p of missiles) {
      expect(p.nativeBody.sprite).toBe(spriteId);
      expect(p.nativeTimer.remaining).toBe(timer);
      expect(p.vx).toBe(direction * 200);
      expect(p.vy).toBeCloseTo(0);
      expect(p.nativeDetonation).toMatchObject({
        damage, push, offset,
      });
    }
  }
});

for (const [kind, carrier, sprite, damage] of [["airstrike", "airjetg", "airmisl", 30], ["postal", "postbox", "letter1", 50], ["napalmstrike", "airjeto", "airmisl", 15], ["carpetbomb", "cpttruck", "carpet2", 30]])
test(`live ${kind} aircraft releases original missiles and resolves its strike`, async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#inventory-toggle").click();

  await page.locator(`[data-weapon="${kind}"]`).click();
  await page.locator("#fire").click();
  const box = await page.locator("#arena").boundingBox();
  await page.evaluate(() => {
    window.strikeCameraSamples = [];
    function sample() {
      const s = window.siege.getState();
      window.strikeCameraSamples.push({
        focus: s.nativeCameraFocus,
        camera: s.camera,
        aircraft: s.airstrikes.length,
        missiles: s.bombs.length,
      });
      if (window.strikeCameraSamples.length < 1800)
        window.strikeCameraFrame = requestAnimationFrame(sample);
    }
    sample();
  });
  // Different native flight paths need different targets on this fixed map:
  // keep missiles on land without striking the central barrel with Air Strike.
  const targetX = kind === "airstrike" ? 0.75 : 0.5;
  await page.mouse.click(box.x + box.width * targetX, box.y + box.height * 0.55);
  const strike = await page.evaluate(
    () => window.siege.getState().airstrikes[0],
  );
  expect(strike.sprite).toBe(carrier);
  expect(await page.evaluate(kind => window.siege.getState().ammo[0][kind], kind)).toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().bombs.length), {
      timeout: 10000,
    })
    .toBeGreaterThan(0);
  const missiles = await page.evaluate(() => window.siege.getState().bombs);
  expect(
    missiles.every((b) => b.sprite === sprite && b.nativeDamage === damage),
  ).toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().bombs.length), {
      timeout: 15000,
    })
    .toBe(0);
  expect(
    await page.evaluate(() => window.siege.getState().explosions),
  ).toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().airstrikes.length))
    .toBe(0);
  const samples = await page.evaluate(() => {
    cancelAnimationFrame(window.strikeCameraFrame);
    return window.strikeCameraSamples;
  });
  expect(samples.some((s) => s.aircraft && s.focus && s.camera.y > 0)).toBe(
    true,
  );
  expect(samples.some((s) => s.missiles && s.focus)).toBe(true);
  if (kind === "napalmstrike") {
    expect(
      await page.evaluate(() => window.siege.getState().nativeFlames.length),
    ).toBeGreaterThan(0);
    await expect
      .poll(() => page.evaluate(() => window.siege.getState().nativeCameraFocus), {
        timeout: 20000,
      })
      .toBeNull();
  } else {
    await expect
      .poll(() => page.evaluate(() => window.siege.getState().nativeCameraFocus), {
        timeout: 20000,
      })
      .toBeNull();
  }
});

import {
  nativeProjectileDetonationEvents,
} from "../src/armageddon/projectile-runtime.js";
test("native napalm strike releases record-driven fire missiles", { tag: "@logic" }, () => {
  const strike = createNativeAirstrike(600, 300, 1, 0, 650, 1, "napalmstrike");
  expect(strike.sprite).toBe(674);
  expect(strike.sound).toBe(52);
  expect(strike.config).toMatchObject({
    count: 5, spacing: 48, speed: 100, kind: 2,
  });
  const missiles = [];
  let removed = false;
  for (let tick = 0; tick < 300 && !removed; tick++) {
    const result = stepNativeAirstrike(strike, 650);
    missiles.push(...result.missiles);
    removed = result.removed;
  }
  expect(removed).toBe(true);
  expect(missiles).toHaveLength(5);
  const missile = missiles[0];
  expect(missile.nativeBody.sprite).toBe(649);
  expect(missile.nativeDetonation).toMatchObject({
    push: 40, damage: 15, secondary: 2, offset: 0,
  });
  expect(missile.nativeFire).toEqual({
    count: 60, delay: 66, lifetime: 6250, persistent: 0,
  });
  expect(nativeProjectileDetonationEvents(missile, () => 0)).toEqual([
    { operation: "blast", request: [1, 16252928, -13631488, 40, 15, 1] },
    { operation: "fire", request: [16252928, -13631488] },
  ]);
});

test("native carpet bomb releases record-driven bomb payloads", { tag: "@logic" }, () => {
  const strike = createNativeAirstrike(600, 300, 1, 0, 650, 1, "carpetbomb");
  expect(strike.sprite).toBe(684);
  expect(strike.sound).toBe(52);
  expect(strike.config).toMatchObject({
    count: 5, spacing: 32, speed: 100, kind: 2,
  });
  const missiles = [];
  let removed = false;
  for (let tick = 0; tick < 300 && !removed; tick++) {
    const result = stepNativeAirstrike(strike, 650);
    missiles.push(...result.missiles);
    removed = result.removed;
  }
  expect(removed).toBe(true);
  expect(missiles).toHaveLength(5);
  const missile = missiles[0];
  expect(missile.nativeBody).toMatchObject({ sprite: 686, hitMask: 0 });
  expect(missile.nativeDetonation).toMatchObject({
    push: 100, damage: 30, secondary: 0, offset: 0,
  });
  expect(missile.nativeTimer.remaining).toBe(9000);
  expect(nativeProjectileDetonationEvents(missile, () => 0)).toEqual([
    { operation: "blast", request: [1, 16252928, -13631488, 100, 30, 1] },
  ]);
});
