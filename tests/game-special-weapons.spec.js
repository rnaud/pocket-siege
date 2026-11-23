import { test, expect } from "./helpers/shared-page.js";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
import { startMatch } from "./helpers/match.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
test("flame thrower streams its 56 original rounds", async ({ page }) => {
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  const result = await page.evaluate(() => {
    window.siege.debug.advanceReplayFrames(30);
    window.siege.debug.setAmmo(0, "flamethrower", 9);
    window.siege.debug.setWeapon("flamethrower");
    // Aim level so no flame falls back on the shooter and interrupts it.
    const aim = document.querySelector("#angle");
    aim.value = 0; aim.dispatchEvent(new Event("input", { bubbles: true }));
    window.siege.debug.advanceReplayFrames(5);
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: " ", code: "Space", bubbles: true }));
    key("keydown"); window.siege.debug.advanceReplayFrames(2); key("keyup");
    let peak = 0, done = -1;
    for (let i = 0; i < 400 && done < 0; i++) {
      window.siege.debug.advanceReplayFrames(1);
      peak = Math.max(peak, window.siege.getState().flames);
      if (/Flame thrower burst complete/.test(document.querySelector("#status").textContent)) done = i;
    }
    return { peak, done, ammo: window.siege.getState().ammo[0].flamethrower };
  });
  expect(result.ammo).toBe(8);
  expect(result.peak).toBeGreaterThan(10);
  // Record +0x74 = 56 rounds through the burst/recoil cycle: about four seconds.
  expect(result.done).toBeGreaterThan(150);
  expect(result.done).toBeLessThan(300);
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

test("kamikaze from the arsenal flies off and removes the active worm", async ({ page }) => {
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

test("earthquake shakes the island for eight seconds and throws worms", async ({ page }) => {
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const quake = await page.evaluate(() => {
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: " ", code: "Space", bubbles: true }));
    window.siege.debug.advanceReplayFrames(30);
    window.siege.debug.setAmmo(0, "earthquake", 9);
    window.siege.debug.setWeapon("earthquake");
    const team = window.siege.getState().team;
    key("keydown"); window.siege.debug.advanceReplayFrames(2); key("keyup");
    let peak = 0, shake = 0, frames = 0, ended = 0;
    const thrown = new Set(), moved = new Set();
    const start = window.siege.getState().worms.map((w) => [w.x, w.y]);
    for (let i = 0; i < 2000; i++) {
      window.siege.debug.advanceReplayFrames(1);
      const s = window.siege.getState();
      if (s.earthquake) { frames++; peak = Math.max(peak, s.earthquake.strength); }
      else if (frames && !ended) ended = i;
      shake = Math.max(shake, s.earthquakeShake);
      s.worms.forEach((w, index) => {
        if (w.nativeState === 0x7f) thrown.add(index);
        if (Math.hypot(w.x - start[index][0], w.y - start[index][1]) > 2) moved.add(index);
      });
      if (ended && s.team !== team) break;
    }
    const s = window.siege.getState();
    return { peak, shake, frames, thrown: thrown.size, moved: moved.size, team: s.team, before: team,
      ammo: s.ammo[0].earthquake, hp: s.worms.map((w) => w.hp) };
  });
  expect(errors).toEqual([]);
  expect(quake.ammo).toBe(8);
  // 004EB2E0: the strength ramps to 1.0 over 8 s * 50 frames, then settles.
  expect(quake.peak).toBe(0x10000);
  expect(quake.frames).toBeGreaterThan(400);
  expect(quake.shake).toBe(0x80000);
  // Every resting worm is kicked into flight (0x7F); the quake itself deals no damage.
  expect(quake.thrown).toBeGreaterThan(3);
  expect(quake.moved).toBeGreaterThan(3);
  expect(quake.team).not.toBe(quake.before);
});

test("a second fire press splits a flying super banana, as fire mode 1 allows", async ({ page }) => {
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  const result = await page.evaluate(() => {
    window.siege.debug.advanceReplayFrames(30);
    window.siege.debug.setAmmo(0, "superbanana", 9);
    window.siege.debug.setWeapon("superbanana");
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: " ", code: "Space", bubbles: true }));
    key("keydown"); window.siege.debug.advanceReplayFrames(25); key("keyup");
    window.siege.debug.advanceReplayFrames(15);
    const flying = window.siege.getState().projectile?.kind ?? null;
    // 004E44A0 event 0x414: word 22 = 1 sets state 1, so it detonates now.
    key("keydown"); window.siege.debug.advanceReplayFrames(2); key("keyup");
    const s = window.siege.getState();
    return { flying, kids: s.bombs.map((b) => b.nativeRepeat).sort(), projectile: s.projectile?.kind ?? null };
  });
  expect(result.flying).toBe("superbanana");
  expect(result.projectile).toBeNull();
  expect(result.kids).toEqual([1, 2, 3, 4, 5]);
});
