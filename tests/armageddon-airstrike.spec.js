import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/airstrike.json" with { type: "json" };
import {
  nativeAirstrikeInitial,
  nativeAirstrikeTick,
} from "../src/armageddon/airstrike.js";

test("airstrike approach and missile payloads match the original aircraft task", () => {
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
test(`live ${kind} adapter releases five original missile bodies on consecutive ticks`, () => {
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

for (const [kind, carrier, sprite, damage] of [["airstrike", "airjetg", "airmisl", 30], ["postal", "postbox", "letter1", 50]])
test(`live ${kind} aircraft releases original missiles and resolves its strike`, async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#inventory-toggle").click();
  await page.locator("#special-toggle").click();
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
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.55);
  const strike = await page.evaluate(
    () => window.siege.getState().airstrikes[0],
  );
  expect(strike.sprite).toBe(carrier);
  expect(await page.evaluate(kind => window.siege.getState().ammo[0][kind], kind)).toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().bombs.length))
    .toBe(5);
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
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().nativeCameraFocus))
    .toBeNull();
});
