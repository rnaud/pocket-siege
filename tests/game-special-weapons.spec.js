import { test, expect } from "./helpers/shared-page.js";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
import { startMatch } from "./helpers/match.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
test("flame thrower emits native flames and spends its stream", async ({ page }) => {
  await startMatch(page, { map: "fern", seed: 42 });
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("aim");
  await openArsenal(page);
  await page.locator('[data-weapon="flamethrower"]').click();
  await chargeFor(page, 250);
  await advanceUntil(page, (s) => s.flames > 0, { max: 500, label: "flames" });
  const before = await page.evaluate(() => window.siege.getState().ammo[0].flamethrower);
  expect(before).toBeLessThan(56);
  // The stream runs to its end: its own flames do not knock the shooter.
  await advanceUntil(page, () => /Flame thrower complete/.test(document.querySelector("#status").textContent),
    { max: 200, label: "stream complete" });
});


test("scales of justice balances team health", async ({ page }) => {
  await startMatch(page, { map: "fern", seed: 42 });
  await openArsenal(page);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("aim");
  await page.evaluate(() => window.siege.debug.hit(1, 50));
  await page.locator('[data-weapon="scales"]').click();
  await chargeFor(page, 250);
  const teamHp = (s) => [s.worms.slice(0, 3), s.worms.slice(3)].map((team) =>
    team.reduce((sum, w) => sum + w.hp, 0));
  await advanceUntil(page, (s) => s.worms.slice(0, 3).reduce((a, w) => a + w.hp, 0) === 225, { max: 500, label: "balanced" });
  expect(teamHp(await page.evaluate(() => window.siege.getState()))).toEqual([225, 225]);
});

test("all special weapons are reachable from the arsenal sheet", async ({ page }) => {
  await startMatch(page);
  await openArsenal(page);
  for (const kind of ["flamethrower", "scales", "sheep", "supersheep",
    "aquasheep", "donkey", "oldwoman", "molesquadron", "mingvase",
    "sallyarmy", "skunk", "madcow", "molebomb", "mbbomb", "nuclearbomb", "armageddon", "sheeplauncher", "longbow", "earthquake", "kamikaze", "suicidebomber"]) {
    await expect(page.locator(`[data-weapon="${kind}"]`)).toBeVisible();
  }
});

test("kamikaze self-destructs the active worm", async ({ page }) => {
  await startMatch(page);
  await openArsenal(page);
  await page.locator('[data-weapon="kamikaze"]').click();
  const shooter = await page.evaluate(() => window.siege.getState().current);
  await chargeFor(page, 250);
  await advanceUntil(page, (s, i) => s.worms[i].hp === 0, { arg: shooter, max: 1000, label: "kamikaze" });
});

test("crate spy reveals the current crate contents", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  // Custom keeps the host crate rules; Classic duel draws crates from the scheme bag.
  await page.selectOption("#scheme", "custom");
  await page.locator("#start").click();
  await advanceUntil(page, (s) => s.crates.length > 0, { max: 500, step: 5, label: "crate" });
  await page.evaluate(() => window.siege.debug.setTeamModifier(0x20, 0));
  await expect(page.locator("#crate-spy")).toContainText("CRATES:");
  await expect(page.locator(".crate-spy-label").first()).toBeVisible();
});

test("earthquake damages grounded worms", async ({ page }) => {
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
  const before = await page.evaluate(() =>
    window.siege.getState().worms.reduce((sum, w) => sum + w.hp, 0));
  await page.locator('[data-weapon="earthquake"]').click();
  // Sample the shake every frame from before firing: a slow runner can land
  // the quake during the real-time key press, before stepping starts.
  await page.evaluate(() => {
    window.quakeShake = 0;
    const sample = () => {
      window.quakeShake = Math.max(window.quakeShake, window.siege.getState().earthquakeShake);
      window.quakeFrame = requestAnimationFrame(sample);
    };
    sample();
  });
  await chargeFor(page, 250);
  // Step frames synchronously and keep the strongest shake: on a slow runner
  // the shake can decay between polls before the damage is observed.
  const quake = await page.evaluate((before) => {
    let shake = window.quakeShake, hp = window.siege.getState().worms.reduce((sum, w) => sum + w.hp, 0);
    for (let frame = 0; frame < 1500 && hp >= before; frame++) {
      window.siege.debug.advanceReplayFrames(1);
      const s = window.siege.getState();
      shake = Math.max(shake, s.earthquakeShake);
      hp = s.worms.reduce((sum, w) => sum + w.hp, 0);
    }
    cancelAnimationFrame(window.quakeFrame);
    return { shake: Math.max(shake, window.quakeShake), hp };
  }, before);
  expect(quake.hp).toBeLessThan(before);
  expect(Math.max(quake.shake, await page.evaluate(() => window.siege.getState().earthquakeShakePeak))).toBeGreaterThan(0);
});
