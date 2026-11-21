import { test, expect } from "./helpers/shared-page.js";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
// One test per tray weapon (each needs a fresh match); the shared title prefix
// keeps all three in the CI smoke selection.
test("special tray fires shotgun, dynamite and airstrike: shotgun", async ({ page }) => {
  await startCustomMatch(page);
  await expect(page.locator(".weapons [data-weapon]")).toHaveCount(52);
  await page.locator('[data-weapon="shotgun"]').click();
  await page.evaluate(() => {
    window.shotgunSpriteProbe = {
      active: true,
      shothit: false,
      shotcase: false,
    };
    const sample = () => {
      const probe = window.shotgunSpriteProbe;
      if (!probe.active) return;
      for (const p of window.siege.getState().nativeParticles) {
        if (p.sprite === "shothit" || p.sprite === "shotcase")
          probe[p.sprite] = true;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.locator("#fire").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().shotCount))
    .toBe(1);
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.ammo[0].shotgun).toBe(2);
  expect(state.phase).toBe("aim");
  expect(state.shotgunRemaining).toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.shotgunSpriteProbe.shothit))
    .toBe(true);
  expect(await page.evaluate(() => window.shotgunSpriteProbe.shotcase)).toBe(
    true,
  );
  await page.evaluate(() => {
    window.shotgunSpriteProbe.active = false;
  });
  await page.locator("#fire").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().shotCount))
    .toBe(2);
  state = await page.evaluate(() => window.siege.getState());
  expect(state.ammo[0].shotgun).toBe(2);
  expect(state.shotgunRemaining).toBe(0);
  expect(state.phase).toBe("settle");
  expect(state.lastShot.impact.kind).toBe("shotgun");
});

test("special tray fires shotgun, dynamite and airstrike: dynamite", async ({ page }) => {
  await startCustomMatch(page);
  await page.locator('[data-weapon="dynamite"]').click();
  await page.locator("#fire").click();
  await advanceFrames(page, 8);
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.ammo[0].dynamite).toBe(1);
  expect(state.bombs.some((b) => b.kind === "dynamite")).toBe(true);
});

test("special tray fires shotgun, dynamite and airstrike: airstrike", async ({ page }) => {
  await startCustomMatch(page);
  await page.locator('[data-weapon="airstrike"]').click();
  await page.locator("#fire").click();
  expect(await page.evaluate(() => window.siege.getState().targetUtility)).toBe(
    "airstrike",
  );
  const box = await page.locator("#arena").boundingBox();
  await page.mouse.click(box.x + box.width * 0.65, box.y + box.height * 0.4);
  await expect.poll(() => page.evaluate(() => window.siege.getState().bombs.length)).toBe(5);
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.ammo[0].airstrike).toBe(0);
  expect(state.bombs.length).toBe(5);
});

test("cluster bomblets and native petrol flames resolve their effects", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  // Custom keeps the host kit; Classic duel starts with the original default kit.
  await page.selectOption("#scheme", "custom");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.explodeAt(600, 350, "cluster"));
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.explosions).toBeGreaterThanOrEqual(1);
  expect(state.bombs.length).toBeGreaterThanOrEqual(4);
  expect(state.ammo[0].cluster).toBe(2);

  await page.reload();
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  // Capture creation before the native100ms spread can run between API calls.
  state = await page.evaluate(() => {
    window.siege.debug.explodeAt(600, 350, "napalm");
    return window.siege.getState();
  });
  expect(state.nativeFlames).toHaveLength(1);
  expect(state.nativeFlames[0].record.slice(7)).toEqual([4000, 100, 20, 1]);
  expect(state.ammo[0].napalm).toBe(2);
});
