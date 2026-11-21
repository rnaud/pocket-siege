import { test, expect } from "./helpers/shared-page.js";
import { nativeHitscanWeapon } from "../src/armageddon/hitscan-art.js";
import { advanceUntil } from "./helpers/misc-advance.js";
import { startMatch } from "./helpers/match.js";

test("handgun reads original resource195 bullet and burst fields", { tag: "@logic" }, () => {
  const config = nativeHitscanWeapon("handgun");
  expect(config).toMatchObject({
    total: 6, interval: 500,
    ray: { count: 1, spread: 0, range: 1920, collisionMask: 4332670 },
    resolution: { mode: 4, damage: 5, variance: 0, push: 50 },
  });
});

async function start(page) {
  // Burst/retreat timing must not depend on a randomly selected authored map.
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  await page.evaluate(() => {
    // Supply-drop settlement is independent of the burst interruption check.
    window.siege.debug.setCrateKind("grenade");
    window.siege.debug.collectCrate();
    window.siege.debug.setAmmo(0, "handgun", 1);
  });
  await page.locator("#inventory-toggle").click();

  await page.locator('[data-weapon="handgun"]').click();
  await page.locator("#angle").fill("90");
  await page.locator("#angle").dispatchEvent("input");
}

test("handgun fires six timed bullets for one ammo and then retreats", async ({ page }) => {
  await start(page);
  await page.locator("#fire").click();
  await expect(page.locator("#fire")).toBeDisabled();
  // Step the burst synchronously and sample the recorded simulation release
  // tick of each bullet, not a later render tick.
  const { frames, state } = await page.evaluate(() => {
    const frames = [];
    for (let tick = 0; tick < 1000; tick++) {
      const s = window.siege.getState();
      if (s.shotCount > frames.length) frames.push(s.lastShot.frame);
      if (s.shotCount >= 6 && s.preparing === null) return { frames, state: s };
      window.siege.debug.advanceReplayFrames(1);
    }
    return { frames, state: window.siege.getState() };
  });
  expect(state.shotCount).toBe(6);
  expect(state.preparing).toBeNull();
  expect(state.ammo[0].handgun).toBe(0);
  expect(state.phase).toBe("settle");
  expect(frames).toHaveLength(6);
  for (let i = 1; i < frames.length; i++) expect(frames[i] - frames[i - 1]).toBeGreaterThanOrEqual(29);
});

test("damage interrupts a spent handgun burst without firing remaining bullets", async ({ page }) => {
  await start(page);
  await page.locator("#fire").click();
  // Interrupt on the first released shot, stepping the simulation synchronously.
  await advanceUntil(page, (s) => s.shotCount >= 1, { label: "first bullet" });
  await page.evaluate(() => window.siege.debug.hit(0, 1));
  await advanceUntil(page, (s) => s.preparing === null && s.team === 1, { label: "burst cancelled and turn passed" });
  // Keep stepping well past the 500 ms bullet interval: no more bullets fire.
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(40));
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.shotCount).toBe(1);
  expect(state.ammo[0].handgun).toBe(0);
  expect(state.team).toBe(1);
});
