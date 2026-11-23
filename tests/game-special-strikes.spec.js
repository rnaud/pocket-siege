import { test, expect } from "./helpers/shared-page.js";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
import { startMatch } from "./helpers/match.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
test("unit weapons fire without missing projectile art", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startMatch(page);
  await openArsenal(page);
  await page.locator('[data-weapon="sheep"]').click();
  await chargeFor(page, 500);
  await advanceUntil(page, (s) => s.projectile?.kind === "sheep", { max: 250, label: "sheep released" });
  expect(errors).toEqual([]);
});

test("sheep launcher fires slot 5's sheep, which lands and walks as a secondary", async ({ page }) => {
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  const result = await page.evaluate(() => {
    window.siege.debug.advanceReplayFrames(30);
    window.siege.debug.setAmmo(0, "sheeplauncher", 9);
    window.siege.debug.setWeapon("sheeplauncher");
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: " ", code: "Space", bubbles: true }));
    key("keydown"); window.siege.debug.advanceReplayFrames(2); key("keyup");
    let flew = false, walker = null;
    for (let i = 0; i < 300 && !walker; i++) {
      window.siege.debug.advanceReplayFrames(1);
      const s = window.siege.getState();
      if (s.projectile?.kind === "sheeplauncher") flew = true;
      walker = s.bombs.find((b) => b.nativeRepeat === 1) ?? null;
    }
    // Fire mode 1: the owner's fire key sets the walking sheep off.
    window.siege.debug.advanceReplayFrames(20);
    const before = window.siege.getState().bombs.length;
    key("keydown"); window.siege.debug.advanceReplayFrames(1); key("keyup");
    window.siege.debug.advanceReplayFrames(5);
    return { flew, walker, before, after: window.siege.getState().bombs.length,
      ammo: window.siege.getState().ammo[0].sheeplauncher };
  });
  expect(result.ammo).toBe(8);
  // Kind 1 mode 3 at the record's fixed 50% power, then the mode-3 child.
  expect(result.flew).toBe(true);
  expect(result.walker).not.toBeNull();
  expect(result.before).toBe(1);
  expect(result.after).toBe(0);
});

test("armageddon rains native meteors that damage worms", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  // Custom keeps the host kit; Classic duel starts with the original default kit.
  await page.selectOption("#scheme", "custom");
  await page.locator("#start").click();
  await openArsenal(page);
  await page.locator('[data-weapon="armageddon"]').click();
  await chargeFor(page, 250);
  // 004ED41F stores 0x443 {100, 0xa6, 56}; 004EB110 then spawns meteors.
  await advanceUntil(page, (s) => (s.armageddon?.count ?? 100) < 95, { max: 1000, label: "meteors" });
  expect(await page.evaluate(() => window.siege.getState().armageddon))
    .toMatchObject({ interval: 0xa6, weapon: 56 });
  await advanceUntil(page, (s) => s.worms.some((worm) => worm.hp < 100), { max: 2500, label: "meteor damage" });
});

test("nuclear bomb targets a nuclear strike", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  // Custom keeps the host kit; Classic duel starts with the original default kit.
  await page.selectOption("#scheme", "custom");
  await page.locator("#start").click();
  await openArsenal(page);
  await page.locator('[data-weapon="nuclearbomb"]').click();
  await chargeFor(page, 250);
  const box = await page.locator("#arena").boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await advanceUntil(page, (s) => s.explosions > 0, { max: 1000, label: "nuclear strike" });
  expect(await page.evaluate(() =>
    window.siege.getState().worms.some((worm) => worm.nativePoison.amount !== 0),
  )).toBe(true);
});

test("scales of justice caps health at 100 with uneven survivors", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  // Custom keeps the host kit; Classic duel starts with the original default kit.
  await page.selectOption("#scheme", "custom");
  await page.locator("#start").click();
  await openArsenal(page);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("aim");
  await page.evaluate(() => {
    window.siege.debug.setWormHp(4, 0);
    window.siege.debug.setWormHp(5, 0);
  });
  await page.locator('[data-weapon="scales"]').click();
  await chargeFor(page, 250);
  await expect
    .poll(() => page.evaluate(() =>
      Math.max(...window.siege.getState().worms.map((worm) => worm.hp))),
    { timeout: 10000 })
    .toBeLessThanOrEqual(100);
});

test("skunk detonation leaves a gas emitter that poisons nearby worms", async ({ page }) => {
  await startMatch(page);
  await page.evaluate(() => window.siege.debug.setWormPosition(3, 600));
  await page.evaluate(() => window.siege.debug.spawnUnitAt("skunk", 630));
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(20));
  await page.evaluate(() => window.siege.debug.detonateCurrent());
  // The secondary child (delay 1, poison 5) releases a 004D37D0 cloud every frame.
  const result = await page.evaluate(() => {
    let gas = 0, emitter = 0;
    for (let i = 0; i < 600; i++) {
      window.siege.debug.advanceReplayFrames(1);
      const s = window.siege.getState();
      gas = Math.max(gas, s.gasClouds.length);
      emitter = Math.max(emitter, s.bombs.length);
      // Keep a worm standing at the emitter so its clouds reach it.
      if (s.bombs.length) window.siege.debug.setWormPosition(3, s.bombs[0].x);
      if (s.worms.some((worm) => worm.nativePoison.amount !== 0)) return { gas, emitter, poisoned: true };
    }
    return { gas, emitter, poisoned: false };
  });
  expect(result.emitter).toBe(1);
  expect(result.gas).toBeGreaterThan(5);
  expect(result.poisoned).toBe(true);
});
