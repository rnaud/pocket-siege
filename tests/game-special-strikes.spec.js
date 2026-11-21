import { test, expect } from "@playwright/test";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
import { startMatch } from "./helpers/match.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
test("longbow fires a host arrow projectile", async ({ page }) => {
  await startMatch(page);
  await openArsenal(page);
  await page.locator('[data-weapon="longbow"]').click();
  await chargeFor(page, 700);
  await advanceUntil(page, (s) => s.explosions > 0, { max: 1000, label: "arrow impact" });
});

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

test("sheep launcher fires a native sheep projectile", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  // Custom keeps the host kit; Classic duel starts with the original default kit.
  await page.selectOption("#scheme", "custom");
  await page.locator("#start").click();
  await openArsenal(page);
  await page.locator('[data-weapon="sheeplauncher"]').click();
  await chargeFor(page, 500);
  await advanceUntil(page, (s) => s.projectile?.kind === "sheep", { max: 250, label: "sheep released" });
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

test("skunk detonation infects nearby worms with poison", async ({ page }) => {
  await startMatch(page);
  const target = await page.evaluate(() => {
    const state = window.siege.getState();
    return { x: state.worms[3].x, y: state.worms[3].y };
  });
  await page.evaluate(({ x, y }) => window.siege.debug.explodeAt(x, y, "skunk"), target);
  await advanceUntil(page, (s) => s.worms.some((worm) => worm.nativePoison.amount !== 0), { max: 500, label: "poisoned" });
});
