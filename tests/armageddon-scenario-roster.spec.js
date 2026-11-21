import { test, expect } from "./helpers/shared-page.js";
import { resolveScenarioMatch } from "../src/armageddon/scenario-match.js";
import { openScenario, sharedScenario } from "./helpers/scenario-page.js";

sharedScenario("mission/mission0.wam", (shared) => {
  test("scenario secret-weapon option clears the starting secret ammo", async () => {
    const page = shared();
    expect(await page.evaluate(() => window.siege.getState().ammo[0].superbanana)).toBe(0);
    expect(await page.evaluate(() => window.siege.getState().ammo[0].sheep)).toBe(0);
  });
  test("scenario starting loadout replaces unused live ammo", async () => {
    const page = shared();
    const ammo = await page.evaluate(() => window.siege.getState().ammo[0]);
    expect(ammo.shotgun).toBe(3);
    expect(ammo.uzi).toBe(2);
    expect(ammo.grenade).toBe(0);
  });
  test("scenario utility loadout replaces unused field-kit ammo", async () => {
    const page = shared();
    const utilityAmmo = await page.evaluate(() => window.siege.getState().utilities);
    expect(utilityAmmo.girder).toBe(3);
    expect(utilityAmmo.rope).toBe(4);
    expect(utilityAmmo.laser).toBe(1);
    expect(utilityAmmo.bungee).toBe(0);
  });
  test("scenario display round time shows a countdown", async () => {
    const page = shared();
    await expect(page.locator("#scenario-objective")).toContainText(/TIME|\d:\d\d/);
  });
  test("scenario worm-select option hides manual selection", async () => {
    const page = shared();
    await expect(page.locator("#select-worm")).toBeHidden();
  });
  test("scenario pause-between-turns value reaches the live settle delay", async () => {
    const page = shared();
    expect(await page.evaluate(() => window.siege.getState().pauseBetweenTurns)).toBe(0);
  });
  test("scenario worm energies reach the live roster", async () => {
    const page = shared();
    const hp = await page.evaluate(() => window.siege.getState().worms.map((worm) => worm.hp));
    expect(hp[0]).toBe(150);
    expect(hp.slice(3, 6)).toEqual([45, 45, 45]);
  });
  test("scenario girder radius reaches live placement", async () => {
    const page = shared();
    expect(await page.evaluate(() => window.siege.getState().girderRadius)).toBe(1000);
  });
  test("mission difficulty reaches the live AI setting", async () => {
    const page = shared();
    expect(await page.evaluate(() => window.siege.getState().difficulty)).toBe("veteran");
  });
  test("mission team names reach the live HUD", async () => {
    const page = shared();
    await expect(page.locator("#scenario-team-names")).toContainText("Patrol");
  });
  test("authored mission worm positions reach the live roster", async () => {
    const page = shared();
    const state = await page.evaluate(() => window.siege.getState());
    expect(state.worms[0].x).toBeCloseTo(446, 0);
    expect(state.worms[3].x).toBeCloseTo(842, 0);
  });
  test("authored worm names reach the live roster", async () => {
    const page = shared();
    expect(await page.evaluate(() => window.siege.getState().worms[3].name)).toBe("Captain");
  });
  test("authored artillery mode reaches the live worm", async () => {
    const page = shared();
    expect(await page.evaluate(() => window.siege.getState().worms[3].artillery)).toBe(true);
  });
  test("authored grave style reaches the live worm", async () => {
    const page = shared();
    expect(await page.evaluate(() => window.siege.getState().worms[3].graveStyle)).toBe(1);
  });
  test("authored fixed weapon reaches the live CPU worm", async () => {
    const page = shared();
    expect(await page.evaluate(() => window.siege.getState().worms[3].fixedWeapon)).toBe("earthquake");
  });
  test("authored action radius reaches the live worm", async () => {
    const page = shared();
    expect(await page.evaluate(() => window.siege.getState().worms[3].actionRadius)).toBe(0);
  });
  test("teams with fewer authored worms leave the extra live worms disabled", async () => {
    const page = shared();
    const hp = await page.evaluate(() => window.siege.getState().worms.map((worm) => worm.hp));
    expect(hp[0]).toBe(150);
    expect(hp.slice(1, 3)).toEqual([0, 0]);
    expect(hp.slice(3, 6)).toEqual([45, 45, 45]);
  });
  test("mission rosters support a fourth worm per side", async () => {
    const page = shared();
    const worms = await page.evaluate(() => window.siege.getState().worms);
    expect(worms).toHaveLength(9);
    expect(worms[6].hp).toBeGreaterThan(0);
  });
  test("merged CPU worms retain their authored team skill", async () => {
    const page = shared();
    const worms = await page.evaluate(() => window.siege.getState().worms);
    expect(worms[3].teamSkill).toBe(80);
    expect(worms[7].teamSkill).toBe(60);
  });
  test("authored team flag and sound bank are retained", async () => {
    const page = shared();
    const worm = await page.evaluate(() => window.siege.getState().worms[3]);
    expect(worm.flag).toBe(1);
    expect(worm.soundBank).toBe(1);
  });
  test("authored team flags render in the scenario label", async () => {
    const page = shared();
    for (const flag of await page.locator(".scenario-team-flag").all()) {
      await expect(flag).toBeVisible();
      await expect.poll(() => flag.evaluate((image) => image.naturalWidth)).toBe(20);
    }
  });
  test("ObjectType 0 scenarios start with only authored objects", async () => {
    const page = shared();
    expect(resolveScenarioMatch("mission/mission0.wam").objectType).toBe(0);
    // Half a second of play triggers no host-placed objects.
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(25));
    const state = await page.evaluate(() => window.siege.getState());
    expect(state.mines.filter((mine) => !mine.scenario)).toHaveLength(0);
    expect(state.mines).toHaveLength(8);
    expect(state.explosions).toBe(0);
    expect(state.worms.filter((worm) => worm.team === 1).map((worm) => worm.hp))
      .toEqual([45, 45, 45, 100, 45, 45]);
  });
  // Turning sound on starts the match music; keep this last in the group.
  test("scenario sound option selects the authored music track", async () => {
    const page = shared();
    await page.locator("#sound").click();
    await page.waitForFunction(() => document.querySelector("#game-music")?.dataset.track === "ingame-5");
  });
});

sharedScenario("mission/mission23.wam", (shared) => {
  test("mission 23 fields its full nine-worm CPU roster", async () => {
    const page = shared();
    const worms = await page.evaluate(() => window.siege.getState().worms);
    expect(worms).toHaveLength(12);
    expect(worms.filter((worm) => worm.team === 1)).toHaveLength(9);
  });
  test("merged CPU teams retain their authored alliance group", async () => {
    const page = shared();
    const worms = await page.evaluate(() => window.siege.getState().worms);
    expect(worms[3].alliance).toBe(0);
    expect(worms[6].alliance).toBe(1);
  });
  test("hostile CPU alliance groups show separate health", async () => {
    const page = shared();
    const text = await page.locator("#scenario-alliance-health").textContent();
    expect(text).toContain("Cannon Fodder");
    expect(text).toContain("Patrol");
  });
  test("alliance health rows carry the group flag", async () => {
    const page = shared();
    for (const flag of await page.locator(".scenario-alliance-flag").all())
      await expect.poll(() => flag.evaluate((image) => image.naturalWidth)).toBe(20);
  });
  test("live state exposes the worm alliance identity", async () => {
    const page = shared();
    const worms = await page.evaluate(() => window.siege.getState().worms);
    expect(worms[3].allianceName).toBe("Cannon Fodder");
    expect(worms[6].allianceName).toBe("Patrol");
  });
  // Damage changes the match; keep this last in the group.
  test("per-alliance health updates after damage", async () => {
    const page = shared();
    const before = await page.locator("#scenario-alliance-health").textContent();
    await page.evaluate(() => window.siege.debug.hit(1, 10));
    await expect
      .poll(() => page.locator("#scenario-alliance-health").textContent())
      .not.toBe(before);
  });
});

test("authored worm disease reaches the live poison state", async ({ page }) => {
  await openScenario(page, "mission/mission31.wam");
  expect(await page.evaluate(() =>
    window.siege.getState().worms.some((worm) => worm.nativePoison.amount === 3),
  )).toBe(true);
});

test("mission reserve worms do not occupy live slots", async ({ page }) => {
  await openScenario(page, "mission/mission25.wam");
  const worms = await page.evaluate(() => window.siege.getState().worms);
  expect(worms.slice(3, 6).every((worm) => worm.hp > 0)).toBe(true);
});

test("the largest mission fields six worms per side", async ({ page }) => {
  await openScenario(page, "mission/mission22.wam");
  const worms = await page.evaluate(() => window.siege.getState().worms);
  expect(worms).toHaveLength(12);
  for (const team of [0, 1])
    expect(worms.filter((worm) => worm.team === team)).toHaveLength(6);
});
