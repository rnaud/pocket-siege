import { test, expect } from "./helpers/shared-page.js";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
import { startMatch } from "./helpers/match.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
test("mole bomb detonation releases no poison gas", async ({ page }) => {
  await startMatch(page);
  await page.evaluate(() => window.siege.debug.setWormPosition(3, 600));
  await page.evaluate(() => window.siege.debug.spawnUnitAt("molebomb", 600));
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(40));
  await page.evaluate(() => window.siege.debug.detonateCurrent());
  // Mole Bomb's blocks carry no 004E3870 gas delay in the original records.
  const result = await page.evaluate(() => {
    let gas = 0;
    for (let i = 0; i < 300; i++) {
      window.siege.debug.advanceReplayFrames(1);
      gas = Math.max(gas, window.siege.getState().gasClouds.length);
    }
    return { gas, poisoned: window.siege.getState().worms.some((worm) => worm.nativePoison.amount !== 0) };
  });
  expect(result).toEqual({ gas: 0, poisoned: false });
});

test("sheep units do not walk in water", async ({ page }) => {
  await startMatch(page);
  const y = await page.evaluate(() => window.siege.getState().waterLevel - 4);
  // 004E3920 returns before stepping while the body is submerged; Aqua Sheep
  // moves under water only in flight.
  for (const kind of ["sheep", "aquasheep"]) {
    await page.evaluate(({ kind, y }) => window.siege.debug.spawnUnitAt(kind, 600, y), { kind, y });
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(30));
    expect(await page.evaluate(() => window.siege.getState().projectile?.walkTicks ?? 0), kind).toBe(0);
  }
});

test("mole bomb's mole digs into the ground and explodes below it", async ({ page }) => {
  await startMatch(page);
  await page.evaluate(() => window.siege.debug.spawnUnitAt("molebomb", 600));
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(20));
  const start = await page.evaluate(() => window.siege.getState().projectile?.y ?? null);
  expect(start).not.toBeNull();
  await page.evaluate(() => window.siege.debug.detonateCurrent());
  // The primary does no damage; its mode-4 child jumps, lands, then 004E3570
  // follows its arc through the terrain until it surfaces armed or explodes.
  const result = await page.evaluate(() => {
    let lowest = Infinity, moles = 0;
    for (let i = 0; i < 600; i++) {
      window.siege.debug.advanceReplayFrames(1);
      const s = window.siege.getState();
      for (const b of s.bombs) { moles = Math.max(moles, s.bombs.length); lowest = Math.min(lowest, b.y); }
      if (!s.bombs.length && moles) break;
    }
    return { lowest, moles, blast: window.siege.getState().lastExplosion };
  });
  expect(result.moles).toBe(1);
  expect(result.lowest).toBeLessThan(start - 10);
  expect(result.blast.y).toBeLessThan(start);
});

test("classic duel starts with the original default scheme kit", async ({ page }) => {
  await startMatch(page);
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
