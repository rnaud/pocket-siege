import { test, expect } from "@playwright/test";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
test("mole bomb burrows while host-walking", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.spawnUnitAt("molebomb", 600));
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(40));
  const depth = await page.evaluate(() => window.siege.getState().projectile?.burrowDepth ?? 0);
  expect(depth).toBeGreaterThan(0);
});

test("mole bomb detonation poisons nearby worms", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.setWormPosition(3, 600));
  await page.evaluate(() => window.siege.debug.spawnUnitAt("molebomb", 600));
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(40));
  await page.evaluate(() => window.siege.debug.detonateCurrent());
  await expect
    .poll(() => page.evaluate(() =>
      window.siege.getState().worms.some((worm) => worm.nativePoison.amount !== 0)))
    .toBe(true);
});

test("sheep units do not walk in water", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  const y = await page.evaluate(() => window.siege.getState().waterLevel - 4);
  // 004E3920 returns before stepping while the body is submerged; Aqua Sheep
  // moves under water only in flight.
  for (const kind of ["sheep", "aquasheep"]) {
    await page.evaluate(({ kind, y }) => window.siege.debug.spawnUnitAt(kind, 600, y), { kind, y });
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(30));
    expect(await page.evaluate(() => window.siege.getState().projectile?.walkTicks ?? 0), kind).toBe(0);
  }
});

test("mole bomb detonates below its burrow depth", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.spawnUnitAt("molebomb", 600));
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(40));
  const before = await page.evaluate(() => window.siege.getState().projectile?.y ?? null);
  expect(before).not.toBeNull();
  await page.evaluate(() => window.siege.debug.detonateCurrent());
  const blastY = await page.evaluate(() => window.siege.getState().lastExplosion?.y ?? null);
  expect(blastY).not.toBeNull();
  expect(blastY).toBeLessThan(before);
});

test("walking units reverse at the map edge", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.spawnUnitAt("donkey", 1850));
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(40));
  const state = await page.evaluate(() => window.siege.getState().projectile);
  expect(state).not.toBeNull();
  expect(state.walkTicks).toBeGreaterThan(0);
  expect(state.x).toBeLessThan(1850);
});

test("classic duel starts with the original default scheme kit", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  // Resource 195 through 00415540/00417750/004C2640.
  expect(await page.evaluate(() => {
    const { ammo, utilities } = window.siege.getState();
    const [kit, kitUtilities] = [ammo[0], utilities];
    return { grenade: kit.grenade === Infinity, shotgun: kit.shotgun === Infinity,
      mortar: kit.mortar, cluster: kit.cluster, homing: kit.homing, supersheep: kit.supersheep,
      holy: kit.holy, rope: kitUtilities.rope, girder: kitUtilities.girder, jetpack: kitUtilities.jetpack };
  })).toEqual({ grenade: true, shotgun: true, mortar: 5, cluster: 3, homing: 1, supersheep: 0,
    holy: 0, rope: 5, girder: 3, jetpack: 0 });
});

test("classic duel sudden death waits for the scheme's fifteen-minute round", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  expect(await page.locator("#sudden-death").inputValue()).toBe("health");
  await page.locator("#start").click();
  // The host round-six trigger no longer applies; round time drives it.
  for (let i = 0; i < 14; i++) await page.evaluate(() => window.siege.debug.finishTurn());
  expect(await page.evaluate(() => window.siege.getState().suddenDeath)).toBe(false);
  for (const frames of [15000, 15000, 15500])
    await page.evaluate((count) => window.siege.debug.advanceReplayFrames(count), frames);
  // Round expiry arms the countdown; onset comes on a between-turn pass.
  await page.evaluate(() => {
    for (let pass = 0; pass < 6 && !window.siege.getState().suddenDeath; pass++) {
      window.siege.debug.finishTurn();
      window.siege.debug.advanceReplayFrames(100);
    }
  });
  expect(await page.evaluate(() => window.siege.getState().suddenDeath)).toBe(true);
});
