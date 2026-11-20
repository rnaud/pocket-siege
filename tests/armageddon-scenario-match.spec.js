import { test, expect } from "@playwright/test";
import missionNames from "../src/armageddon/mission-names.json" with { type: "json" };
import mapCatalog from "../src/armageddon/map-catalog.json" with { type: "json" };
import { resolveScenarioMatch } from "../src/armageddon/scenario-match.js";
import { nativeInitialWaterY, nativeScenarioWaterLevel } from "../src/armageddon/scenario-water.js";
import { originalResourceString } from "../src/armageddon/string-resources.js";

test("every mission and training resolves its original landscape and turn rules", { tag: "@logic" }, () => {
  const terrainIds = new Set(mapCatalog.map((entry) => entry.id));
  const paths = Object.keys(missionNames);
  expect(paths).toHaveLength(48);
  for (const path of paths) {
    const scenario = resolveScenarioMatch(path);
    expect(scenario, path).not.toBeNull();
    expect(scenario.teamWorms).toHaveLength(2);
    expect(scenario.teamNames).toHaveLength(2);
    expect(scenario.teamGraves).toHaveLength(2);
    expect(scenario.training, path).toBe(/\/training\d+\.wam$/i.test(path));
    expect(terrainIds.has(scenario.terrain), `${path} -> ${scenario.terrain}`).toBe(true);
    expect(Number.isFinite(scenario.turnTime)).toBe(true);
    expect(Number.isFinite(scenario.retreatTime)).toBe(true);
  }
  const mission0 = resolveScenarioMatch("mission/mission0.wam");
  expect(mission0).toMatchObject({
    training: false,
    terrain: "mission/missi~11.img",
    turnTime: 45,
    retreatTime: 3,
    teams: 3,
    worms: 7,
    difficulty: 1,
    winningCondition: 3,
  });
  expect(mission0.objects).toHaveLength(13);
  expect(mission0.objects[0]).toMatchObject({
    kind: "weapon", x: 1217, y: 171, content: 34,
  });
  expect(mission0.objects.filter((object) => object.kind === "mine")).toHaveLength(8);
  expect(mission0.objects.filter((object) => object.kind === "drum")).toHaveLength(1);
  expect(mission0.timedObjects).toEqual([
    { kind: "text", textIndex: 104, turn: 2 },
    { kind: "text", textIndex: 37, turn: 4 },
  ]);
  expect(resolveScenarioMatch("mission/mission1.wam").timedObjects[0]).toMatchObject({
    kind: "weapon", turn: 3, content: 7,
  });
  expect(resolveScenarioMatch("mission/mission5.wam").objects.filter((object) => object.kind === "health")).toHaveLength(2);
  expect(resolveScenarioMatch("mission/training3.wam")).toMatchObject({
    windStrength: -1, fixedWind: -35,
  });
  expect(resolveScenarioMatch("mission/mission15.wam").friction).toBe(40);
  expect(resolveScenarioMatch("mission/training13.wam").fallDamage).toBe(3);
  expect(resolveScenarioMatch("mission/mission1.wam").mineFuse).toBe(4);
  expect(resolveScenarioMatch("mission/mission17.wam").healthCrateEnergy).toBe(15);
  expect(resolveScenarioMatch("mission/mission24.wam").weaponsDontEndTurn).toBe(true);
  expect(resolveScenarioMatch("mission/mission0.wam").enableSecretWeapons).toBe(false);
  expect(resolveScenarioMatch("mission/mission17.wam").enableSecretWeapons).toBe(true);
  expect(resolveScenarioMatch("mission/mission0.wam").loadouts[0]).toMatchObject({
    shotgun: 3, uzi: 2,
  });
  expect(resolveScenarioMatch("mission/mission18.wam").loadouts[0].uzi).toBe(-1);
  expect(resolveScenarioMatch("mission/mission11.wam").loadouts[0].rocket).toBe(-1);
  expect(resolveScenarioMatch("mission/mission0.wam").teamWorms[0][0].energy).toBe(150);
  expect(resolveScenarioMatch("mission/mission0.wam").utilityLoadouts[0]).toMatchObject({
    girder: 3, rope: 4, laser: 1,
  });
  expect(resolveScenarioMatch("mission/training1.wam").roundTime).toBe(-50);
  expect(resolveScenarioMatch("mission/training11.wam").turnEndFinishesGame).toBe(true);
  expect(resolveScenarioMatch("mission/training11.wam").lossOfControlDoesntEndTurn).toBe(true);
  expect(resolveScenarioMatch("mission/mission12.wam").enableActionReplay).toBe(false);
  expect(resolveScenarioMatch("mission/mission17.wam").jetpackTimeLimit).toBe(10);
  expect(resolveScenarioMatch("mission/mission0.wam").wormSelectDisabled).toBe(true);
  expect(resolveScenarioMatch("mission/mission0.wam").pauseBetweenTurns).toBe(0);
  expect(resolveScenarioMatch("mission/mission0.wam").girderRadius).toBe(1000);
  expect(resolveScenarioMatch("mission/mission0.wam").difficulty).toBe(1);
  expect(resolveScenarioMatch("mission/mission0.wam").teamSkill).toBe(80);
  expect(resolveScenarioMatch("mission/mission0.wam").teamWorms[1][0].fixedWeapon).toBe("earthquake");
  expect(resolveScenarioMatch("mission/mission0.wam").teamWorms[1][0].actionRadius).toBe(0);
  expect(resolveScenarioMatch("mission/mission0.wam").teamNames[1]).toBe("Patrol + Gunners");
  expect(resolveScenarioMatch("mission/mission12.wam").wormSelectDisabled).toBe(false);
  expect(resolveScenarioMatch("mission/mission0.wam").crateDrops).toEqual({
    weapon: 0, health: 0, utility: 0,
  });
  expect(resolveScenarioMatch("mission/training1.wam").suddenDeath.disabled).toBe(false);
  expect(resolveScenarioMatch("mission/mission10.wam").suddenDeath.disabled).toBe(true);
  expect(resolveScenarioMatch("mission/mission10.wam")).toMatchObject({
    indestructibleLandscape: true,
  });
  expect(resolveScenarioMatch("mission/training1.wam").sequenceObjects).toHaveLength(1);
  expect(resolveScenarioMatch("mission/training1.wam").sequenceObjects[0]).toMatchObject({
    kind: "target", x: 1066, y: 434, marked: true,
  });
  const training12 = resolveScenarioMatch("mission/training12.wam").sequenceObjects;
  const text = training12.find((object) => object.kind === "text");
  expect(text).toEqual({ kind: "text", textIndex: 65 });
  expect(originalResourceString(1715 + text.textIndex)).toBe("There may be trouble ahead...");
  expect(resolveScenarioMatch("mission/training1.wam")).toMatchObject({
    training: true,
    terrain: "mission/train~11.img",
    turnTime: 50,
    retreatTime: 5,
  });
});

test("campaign scenario starts on its original landscape and turn rules", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  const first = page.locator(".frontend-mission-list button").first();
  await expect(first).toBeVisible();
  await first.click();
  const play = page.locator(".frontend-play-scenario");
  await expect(play).toBeVisible();
  await expect(page.locator(".frontend-scenario-meta")).toContainText("3 teams · 7 worms");
  await play.click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().mapLayout), {
      timeout: 30000,
    })
    .toMatch(/^original:mission\/.+\.img$/);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), {
      timeout: 30000,
    })
    .toBe("aim");
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.turnTime).toBe(45);
  expect(state.retreatSeconds).toBe(3);
  // Mission 0 places a weapon crate and a Marked, Vital weapon crate.
  await expect
    .poll(() => page.evaluate(
      () => window.siege.getState().crates.filter((crate) => crate.mission).length,
    ))
    .toBe(2);
  expect(await page.evaluate(
    () => window.siege.getState().crates.filter((crate) => !crate.mission).length,
  )).toBe(0);
  await expect
    .poll(() => page.evaluate(
      () => window.siege.getState().mines.filter((mine) => mine.scenario).length,
    ))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(
      () => window.siege.getState().hazards.filter((hazard) => hazard.scenario).length,
    ))
    .toBeGreaterThan(0);
  expect(state.scenario).toMatchObject({ collected: 0, total: 1 });
  await expect(page.locator("#scenario-objective")).toContainText("TARGETS 0/1");
});

async function openScenario(page, path) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator(`[data-mode="${path.includes("training") ? "training" : "missions"}"]`).click();
  await page.locator(`[data-scenario="${path}"]`).click();
  await page.locator(".frontend-play-scenario").click();
  // The default match behind the menu is already aiming; wait for the scenario.
  await expect
    .poll(() => page.evaluate(() => {
      const state = window.siege.getState();
      return Boolean(state.scenario) && state.phase === "aim";
    }), { timeout: 30000 })
    .toBe(true);
}
// Targets are destroyed by native blast packets; worms cannot collect them.
async function destroyTarget(page) {
  // The sequence places the next target on a later frame.
  await expect
    .poll(() => page.evaluate(() =>
      Boolean(window.siege.getState().crates.find((crate) => crate.mission?.target))), { timeout: 10000 })
    .toBe(true);
  const target = await page.evaluate(() =>
    window.siege.getState().crates.find((crate) => crate.mission?.target));
  await page.evaluate(([x, y]) => window.siege.debug.nativeBlastAt(x, y), [target.x, target.y]);
}

test("training sequences place each target after the previous one is destroyed", async ({
  page,
}) => {
  await openScenario(page, "mission/training1.wam");
  const first = await page.evaluate(() => window.siege.getState().crates);
  expect(first.map((crate) => crate.kind)).toEqual(["target"]);
  expect(first[0].nativeBody.kind).toBe(3);
  expect(await page.evaluate(() => window.siege.debug.collectScenarioCrate())).toBe(false);
  await destroyTarget(page);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario))
    .toMatchObject({ collected: 1, total: 2 });
  const second = await page.evaluate(() => window.siege.getState().crates);
  expect(second).toHaveLength(1);
  expect(Math.round(second[0].x)).not.toBe(Math.round(first[0].x));
});

test("completing a training course resolves the match as a win", async ({ page }) => {
  await openScenario(page, "mission/training1.wam");
  for (let i = 0; i < 2; i++) {
    await destroyTarget(page);
    await expect
      .poll(() => page.evaluate(() => window.siege.getState().scenario.collected))
      .toBe(i + 1);
  }
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 10000 })
    .toBe("over");
  const completed = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-scenario-progress-v1") ?? "[]"));
  expect(completed).toContain("mission/training1.wam");
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-scenario-medals-v1") ?? "{}")["mission/training1.wam"],
  )).toBe(3);
  const result = await page.evaluate(() => window.siege.getState().lastResult);
  expect(result.scenario).toMatchObject({ complete: true, collected: 2, total: 2 });
  await expect(page.locator("#turn-label")).toHaveText("SCENARIO COMPLETE");
  // The game then returns to the training list on the finished course.
  await expect(page.locator("#menu")).toHaveAttribute("open", "", { timeout: 10000 });
  await expect(page.locator("#menu")).toHaveAttribute("data-frontend-mode", "training");
  await expect(page.locator('[data-scenario="mission/training1.wam"]')).toHaveAttribute("aria-pressed", "true");
});

test("collecting a mission's vital crate completes WinningCondition 3", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("pocket-siege-scenario-attempts-v1", JSON.stringify({ "mission/mission0.wam": 2 }));
    }
  });
  await openScenario(page, "mission/mission0.wam");
  expect(await page.evaluate(() => window.siege.debug.collectScenarioCrate())).toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 10000 })
    .toBe("over");
  const completed = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-scenario-progress-v1") ?? "[]"));
  expect(completed).toContain("mission/mission0.wam");
  // 004441C7/00444209: 1-3 failed attempts earn silver, then the counter clears.
  expect(await page.evaluate(() => ({
    medal: JSON.parse(localStorage.getItem("pocket-siege-scenario-medals-v1") ?? "{}")["mission/mission0.wam"],
    attempts: JSON.parse(localStorage.getItem("pocket-siege-scenario-attempts-v1") ?? "{}")["mission/mission0.wam"],
  }))).toEqual({ medal: 2 });
});

test("destroying a vital crate fails the mission and counts an attempt", async ({ page }) => {
  await openScenario(page, "mission/mission0.wam");
  const crate = await page.evaluate(() =>
    window.siege.getState().crates.find((entry) => entry.mission?.vital));
  await page.evaluate(([x, y]) => window.siege.debug.nativeBlastAt(x, y), [crate.x, crate.y]);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 10000 })
    .toBe("over");
  await expect(page.locator("#turn-label")).toHaveText("SCENARIO OVER");
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-scenario-attempts-v1") ?? "{}")["mission/mission0.wam"],
  )).toBe(1);
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-scenario-progress-v1") ?? "[]"))).toEqual([]);
});

test("scenario target bonuses update the objective score", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  await page.locator('[data-scenario="mission/training11.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.debug.collectScenarioCrate())).toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario.score))
    .toBeGreaterThan(0);
});


test("scenario fixed wind feeds the native wind selection", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  await page.locator('[data-scenario="mission/training3.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(Math.abs(await page.evaluate(() => window.siege.getState().wind) + 250)).toBeLessThan(0.1);
});


test("scenario friction feeds the live native body setup", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission15.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().friction)).toBe(40);
});


test("indestructible scenario landscape blocks terrain carving", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission10.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const before = await page.evaluate(() => window.siege.getState().terrainPixels);
  await page.evaluate(() => window.siege.debug.explodeAt(600, 350, "cluster"));
  const after = await page.evaluate(() => window.siege.getState().terrainPixels);
  expect(after).toBe(before);
});


test("scenario fall damage option scales live fall damage", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  await page.locator('[data-scenario="mission/training13.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().fallDamageScale)).toBeCloseTo(0.03);
});


test("scenario sudden-death options disable the host round-six trigger", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission10.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().suddenDeathDisabled)).toBe(true);
});


test("scenario water sudden death raises the sea", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const before = await page.evaluate(() => window.siege.getState().waterLevel);
  await page.evaluate(() => window.siege.debug.triggerSuddenDeath());
  // 004B72E1: the sea rises on the next between-turn pass, not at onset.
  await page.evaluate(() => {
    for (let pass = 0; pass < 4; pass++) {
      window.siege.debug.finishTurn();
      window.siege.debug.advanceReplayFrames(300);
    }
  });
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().waterLevel))
    .toBeGreaterThan(before);
});


test("scenario sudden-death worm damage drains health each turn", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  await page.evaluate(() => window.siege.debug.triggerSuddenDeath());
  const before = await page.evaluate(() =>
    window.siege.getState().worms.map((worm) => worm.hp));
  expect(await page.evaluate(() => window.siege.debug.applySuddenDeathDamage())).toBe(true);
  const after = await page.evaluate(() =>
    window.siege.getState().worms.map((worm) => worm.hp));
  expect(after.some((hp, index) => hp < before[index])).toBe(true);
});


test("scenario mine fuse feeds the live mine timer", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission1.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().mineFuse)).toBe(4);
});

test("scenario health-only crate drops produce health crates", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission26.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), {
      timeout: 30000,
    })
    .toBe("aim");
  await expect
    .poll(() => page.evaluate(() => {
      const crates = window.siege.getState().crates.filter((crate) => !crate.scenario);
      return crates[0] ? `${crates[0].kind}:${crates[0].quantity}` : null;
    }), { timeout: 30000 })
    .toBe("health:20");
});


test("scenario weapons-dont-end-turn keeps the same worm active", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission24.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), {
      timeout: 30000,
    })
    .toBe("aim");
  const before = await page.evaluate(() => window.siege.getState().current);
  await page.keyboard.down("Space");
  await page.waitForTimeout(700);
  await page.keyboard.up("Space");
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(1200));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), {
      timeout: 30000,
    })
    .toBe("aim");
  expect(await page.evaluate(() => window.siege.getState().current)).toBe(before);
});


test("scenario logic random seed drives the live match RNG", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  await page.locator('[data-scenario="mission/training1.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().randomSeed)).toBe(3482743);
});


test("scenario secret-weapon option clears the starting secret ammo", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().ammo[0].superbanana)).toBe(0);
  expect(await page.evaluate(() => window.siege.getState().ammo[0].sheep)).toBe(0);
});


test("scenario starting loadout replaces unused live ammo", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const ammo = await page.evaluate(() => window.siege.getState().ammo[0]);
  expect(ammo.shotgun).toBe(3);
  expect(ammo.uzi).toBe(2);
  expect(ammo.grenade).toBe(0);
});


test("scenario utility loadout replaces unused field-kit ammo", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const utilityAmmo = await page.evaluate(() => window.siege.getState().utilities);
  expect(utilityAmmo.girder).toBe(3);
  expect(utilityAmmo.rope).toBe(4);
  expect(utilityAmmo.laser).toBe(1);
  expect(utilityAmmo.bungee).toBe(0);
});


test("training round time-out ends the run after the turn", async ({ page }) => {
  // Trainings omit SuddenDeathType, so 00417278 sets scene 0x11d5d.
  await openScenario(page, "mission/training1.wam");
  expect(await page.evaluate(() => window.siege.getState().roundTimeSeconds)).toBe(50);
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(2800));
  expect(await page.evaluate(() => window.siege.getState().suddenDeath)).toBe(false);
  for (let i = 0; i < 4; i++) await page.evaluate(() => window.siege.debug.finishTurn());
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 10000 })
    .toBe("over");
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-scenario-attempts-v1") ?? "{}")["mission/training1.wam"],
  )).toBe(1);
});

test("mission round time with a sudden-death event expires into sudden death", async ({ page }) => {
  // Mission 30 sets SuddenDeathType 3 with a two-minute round and no vital objects.
  await openScenario(page, "mission/mission30.wam");
  expect(await page.evaluate(() => window.siege.getState().roundTimeSeconds)).toBe(120);
  for (const frames of [2100, 2100, 2100])
    await page.evaluate((count) => window.siege.debug.advanceReplayFrames(count), frames);
  // 004B65D2 arms a countdown of (rand % teams) + 1 between-turn passes;
  // sudden death begins on the pass that reaches zero.
  await page.evaluate(() => {
    for (let pass = 0; pass < 6 && !window.siege.getState().suddenDeath; pass++) {
      window.siege.debug.finishTurn();
      window.siege.debug.advanceReplayFrames(100);
    }
  });
  expect(await page.evaluate(() => {
    const state = window.siege.getState();
    return { suddenDeath: state.suddenDeath, over: state.phase === "over" };
  })).toEqual({ suddenDeath: true, over: false });
});


test("scenario display round time shows a countdown", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  await expect(page.locator("#scenario-objective")).toContainText(/TIME|\d:\d\d/);
});


test("scenario turn-end-finishes-game resolves when the turn expires", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  await page.locator('[data-scenario="mission/training11.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(8000));
  await page.evaluate(() => window.siege.debug.finishTurn());
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), {
      timeout: 30000,
    })
    .toBe("over");
});


test("scenario replay option disables the replay control", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission12.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().replayEnabled)).toBe(false);
});


test("scenario jetpack time limit sets the live fuel tank", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission17.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().jetpackFuel)).toBe(10);
});


test("scenario worm-select option hides manual selection", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), {
      timeout: 30000,
    })
    .toBe("aim");
  await expect(page.locator("#select-worm")).toBeHidden();
});


test("scenario pause-between-turns value reaches the live settle delay", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().pauseBetweenTurns)).toBe(0);
});

test("an eliminated scenario does not report objective completion", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  await page.evaluate(() => window.siege.debug.knockout(1));
  await expect(page.locator("#turn-label")).toHaveText("SCENARIO OVER");
  expect(await page.evaluate(() => window.siege.getState().lastResult.scenario.complete)).toBe(false);
});

test("scenario water sudden death rises again on later rounds", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  await page.evaluate(() => window.siege.debug.triggerSuddenDeath());
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(600));
  const first = await page.evaluate(() => window.siege.getState().waterLevel);
  for (let i = 0; i < 12; i++)
    await page.evaluate(() => window.siege.debug.finishTurn());
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(600));
  const second = await page.evaluate(() => window.siege.getState().waterLevel);
  expect(second).toBeGreaterThan(first);
});


test("mixed-case mission ammo keys still reach the live loadout", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission18.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().ammo[0].uzi)).toBe(-1);
});


test("scenario sound option selects the authored music track", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await page.locator("#sound").click();
  await expect
    .poll(() => page.evaluate(() =>
      document.querySelector("#game-music")?.dataset.track ?? null), {
      timeout: 30000,
    })
    .toBe("ingame-5");
});


test("scenario worm energies reach the live roster", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const hp = await page.evaluate(() => window.siege.getState().worms.map((worm) => worm.hp));
  expect(hp[0]).toBe(150);
  expect(hp.slice(3, 6)).toEqual([45, 45, 45]);
});


test("authored worm disease reaches the live poison state", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission31.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() =>
    window.siege.getState().worms.some((worm) => worm.nativePoison.amount === 3),
  )).toBe(true);
});


test("scenario girder radius reaches live placement", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().girderRadius)).toBe(1000);
});


test("mission difficulty reaches the live AI setting", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().difficulty)).toBe("veteran");
});


test("mission team names reach the live HUD", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  await expect(page.locator("#scenario-team-names")).toContainText("Patrol");
});


test("authored mission worm positions reach the live roster", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.worms[0].x).toBeCloseTo(446, 0);
  expect(state.worms[3].x).toBeCloseTo(842, 0);
});


test("authored worm names reach the live roster", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().worms[3].name)).toBe("Captain");
});


test("authored artillery mode reaches the live worm", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().worms[3].artillery)).toBe(true);
});


test("authored grave style reaches the live worm", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().worms[3].graveStyle)).toBe(1);
});


test("authored fixed weapon reaches the live CPU worm", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().worms[3].fixedWeapon)).toBe("earthquake");
});


test("authored action radius reaches the live worm", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().worms[3].actionRadius)).toBe(0);
});


test("teams with fewer authored worms leave the extra live worms disabled", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const hp = await page.evaluate(() => window.siege.getState().worms.map((worm) => worm.hp));
  expect(hp[0]).toBe(150);
  expect(hp.slice(1, 3)).toEqual([0, 0]);
  expect(hp.slice(3, 6)).toEqual([45, 45, 45]);
});


test("mission reserve worms do not occupy live slots", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission25.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const worms = await page.evaluate(() => window.siege.getState().worms);
  expect(worms.slice(3, 6).every((worm) => worm.hp > 0)).toBe(true);
});


test("mission rosters support a fourth worm per side", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const worms = await page.evaluate(() => window.siege.getState().worms);
  expect(worms).toHaveLength(9);
  expect(worms[6].hp).toBeGreaterThan(0);
});

test("the largest mission fields six worms per side", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission22.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const worms = await page.evaluate(() => window.siege.getState().worms);
  expect(worms).toHaveLength(12);
  for (const team of [0, 1])
    expect(worms.filter((worm) => worm.team === team)).toHaveLength(6);
});


test("mission 23 fields its full nine-worm CPU roster", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission23.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const worms = await page.evaluate(() => window.siege.getState().worms);
  expect(worms).toHaveLength(12);
  expect(worms.filter((worm) => worm.team === 1)).toHaveLength(9);
});


test("merged CPU teams retain their authored alliance group", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission23.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const worms = await page.evaluate(() => window.siege.getState().worms);
  expect(worms[3].alliance).toBe(0);
  expect(worms[6].alliance).toBe(1);
});


test("merged CPU worms retain their authored team skill", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const worms = await page.evaluate(() => window.siege.getState().worms);
  expect(worms[3].teamSkill).toBe(80);
  expect(worms[7].teamSkill).toBe(60);
});


test("authored team flag and sound bank are retained", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const worm = await page.evaluate(() => window.siege.getState().worms[3]);
  expect(worm.flag).toBe(1);
  expect(worm.soundBank).toBe(1);
});

test("authored team flags render in the scenario label", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  for (const flag of await page.locator(".scenario-team-flag").all()) {
    await expect(flag).toBeVisible();
    await expect.poll(() => flag.evaluate((image) => image.naturalWidth)).toBe(20);
  }
});

test("eliminating the player ends the mission as a failure", async ({ page }) => {
  // 004B39A0 modes 2/3 end the game once no human alliance survives.
  await openScenario(page, "mission/mission1.wam");
  await page.evaluate(() => window.siege.debug.knockout(0));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 10000 })
    .toBe("over");
  await expect(page.locator("#turn-label")).toHaveText("SCENARIO OVER");
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-scenario-attempts-v1") ?? "{}")["mission/mission1.wam"],
  )).toBe(1);
});

test("hostile CPU alliance groups show separate health", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission23.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const text = await page.locator("#scenario-alliance-health").textContent();
  expect(text).toContain("Cannon Fodder");
  expect(text).toContain("Patrol");
});

test("per-alliance health updates after damage", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission23.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const before = await page.locator("#scenario-alliance-health").textContent();
  await page.evaluate(() => window.siege.debug.hit(1, 10));
  await expect
    .poll(() => page.locator("#scenario-alliance-health").textContent())
    .not.toBe(before);
});


test("alliance health rows carry the group flag", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission23.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  for (const flag of await page.locator(".scenario-alliance-flag").all())
    await expect.poll(() => flag.evaluate((image) => image.naturalWidth)).toBe(20);
});

test("live state exposes the worm alliance identity", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission23.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const worms = await page.evaluate(() => window.siege.getState().worms);
  expect(worms[3].allianceName).toBe("Cannon Fodder");
  expect(worms[6].allianceName).toBe("Patrol");
});

test("ObjectType 0 scenarios start with only authored objects", async ({ page }) => {
  expect(resolveScenarioMatch("mission/mission0.wam").objectType).toBe(0);
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), { timeout: 30000 })
    .toBeGreaterThan(0);
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.mines.filter((mine) => !mine.scenario)).toHaveLength(0);
  expect(state.mines).toHaveLength(8);
  expect(state.explosions).toBe(0);
  expect(state.worms.filter((worm) => worm.team === 1).map((worm) => worm.hp))
    .toEqual([45, 45, 45, 100, 45, 45]);
});

test("scenario waterline follows Landgen's default water percentage", { tag: "@logic" }, () => {
  expect(nativeInitialWaterY(0)).toBe(696);
  expect(nativeInitialWaterY(50)).toBe(348);
  expect(nativeScenarioWaterLevel(696)).toBe(0);
});

test("training 1 starts its low ledge worm above the scenario waterline", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  await page.locator('[data-scenario="mission/training1.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), { timeout: 30000 })
    .toBeGreaterThan(0);
  await page.waitForTimeout(1000);
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.waterLevel).toBe(0);
  expect(state.phase).toBe("aim");
  expect(state.worms[0]).toMatchObject({ team: 0, hp: 1 });
  expect(state.worms[0].y).toBeGreaterThan(state.waterLevel);
});

test("single-team trainings field no CPU worms and keep the player's turn", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  await page.locator('[data-scenario="mission/training1.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 30000 })
    .toBe("aim");
  expect(await page.evaluate(() => document.body.dataset.scenarioTraining)).toBe("1");
  await expect
    .poll(() => page.evaluate(() =>
      window.siege.getState().worms.filter((worm) => worm.team === 1 && worm.hp > 0).length))
    .toBe(0);
  const start = await page.evaluate(() => window.siege.getState());
  await expect(page.locator(".team").nth(1)).toBeHidden();
  // nextTurn settles poison/environment stages before selecting the next team.
  for (let i = 0; i < 4; i++)
    await page.evaluate(() => window.siege.debug.finishTurn());
  expect(await page.evaluate(() => window.siege.getState().round)).toBeGreaterThan(1);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 15000 })
    .toBe("aim");
  expect(await page.evaluate(() => window.siege.getState().team)).toBe(0);
  await page.evaluate(() => window.siege.debug.knockout(0));
  await expect.poll(() => page.evaluate(() => window.siege.getState().phase)).toBe("over");
});

test("repeated WAM keys keep their first profile value", { tag: "@logic" }, () => {
  expect(resolveScenarioMatch("mission/training8.wam").teamWorms[0][0]).toMatchObject({ x: 328, y: 630 });
  expect(resolveScenarioMatch("mission/training5.wam").teamWorms[0][0]).toMatchObject({ x: 63, y: 615 });
});

test("the campaign list shows earned medals and failed attempts", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pocket-siege-scenario-medals-v1", JSON.stringify({ "mission/training1.wam": 3, "mission/training2.wam": 1 }));
    localStorage.setItem("pocket-siege-scenario-attempts-v1", JSON.stringify({ "mission/training1.wam": 2 }));
  });
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  const medals = page.locator(".frontend-mission-list .frontend-medal");
  await expect(medals.nth(0)).toHaveAttribute("src", /missionmedalgold\.bmp$/);
  await expect(medals.nth(1)).toHaveAttribute("src", /missionmedalbronze\.bmp$/);
  await expect(medals.nth(2)).toHaveAttribute("src", /missionmedalnone\.bmp$/);
  await page.locator('[data-scenario="mission/training1.wam"]').click();
  await expect(page.locator(".frontend-scenario-meta")).toContainText("2 failed attempts");
  await expect(page.locator(".frontend-medal-big")).toHaveAttribute("src", /missionmedalgoldbig\.bmp$/);
});

test("mission Nuclear Test raises the sea by weapon 55's water rise and poisons worms", async ({ page }) => {
  await openScenario(page, "mission/mission1.wam");
  const before = await page.evaluate(() => window.siege.getState().waterLevel);
  expect(await page.evaluate(() => window.siege.debug.missionEvent({ type: 8 }))).toBe(true);
  // 004FC8D0 / 004EF6B0 type 8: 0x441 {entry +0x70 = 120, 8}, 0x439 {entry +0x74 = 2}.
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().waterLevel), { timeout: 20000 })
    .toBeGreaterThanOrEqual(before + 119);
  expect(await page.evaluate(() =>
    window.siege.getState().worms.filter((worm) => worm.hp > 0).every((worm) => worm.nativePoison.amount >= 2)))
    .toBe(true);
});

test("mission and training runtime smoke without opt-in playthrough", async ({ page }) => {
  for (const path of ["mission/mission0.wam", "mission/training1.wam"]) {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page.waitForFunction(() => window.siege?.getState().assetsReady);
    await page.locator(`[data-mode="${path.includes("training") ? "training" : "missions"}"]`).click();
    await page.locator(`[data-scenario="${path}"]`).click();
    await page.locator(".frontend-play-scenario").click();
    await expect
      .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 30000 })
      .toBe("aim");
    for (let i = 0; i < 2; i++)
      await page.evaluate(() => window.siege.debug.finishTurn());
    await expect.poll(() => page.evaluate(() => window.siege.getState().mission?.turn ?? 0))
      .toBeGreaterThan(0);
    expect(errors, path).toEqual([]);
    page.removeAllListeners("pageerror");
  }
});

test("missions unlock one at a time from the first unfinished mission", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem("pocket-siege-unlock-all-missions");
    localStorage.setItem("pocket-siege-scenario-medals-v1", JSON.stringify({ "mission/mission0.wam": 2 }));
  });
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  // Mission 0 is done, so mission 1 is the current mission and mission 2 is locked.
  await expect(page.locator('[data-scenario="mission/mission0.wam"]')).toBeEnabled();
  await expect(page.locator('[data-scenario="mission/mission1.wam"]')).toBeEnabled();
  await expect(page.locator('[data-scenario="mission/mission1.wam"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-scenario="mission/mission2.wam"]')).toBeDisabled();
  await expect(page.locator('[data-scenario="mission/mission2.wam"]')).toContainText("LOCKED");
  await page.locator('[data-mode="training"]').click();
  await expect(page.locator('[data-scenario="mission/training16.wam"]')).toBeEnabled();
});

test("scenario sudden death types 2 and 3 reach health and nuclear modes", async ({
  page,
}) => {
  for (const [path, mode] of [
    ["mission/mission1.wam", "health"],
    ["mission/mission18.wam", "nuke"],
  ]) {
    await page.goto("/");
    await page.waitForFunction(() => window.siege?.getState().assetsReady);
    await page.locator('[data-mode="missions"]').click();
    await page.locator(`[data-scenario="${path}"]`).click();
    await page.locator(".frontend-play-scenario").click();
    await expect
      .poll(() => page.evaluate(() => window.siege.getState().scenario ? 1 : 0), {
        timeout: 30000,
      })
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => window.siege.getState().suddenDeathType))
      .toBe(mode);
  }
});

test("starting a local match after a training restores both teams", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  await page.locator('[data-scenario="mission/training1.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 30000 })
    .toBe("aim");
  await page.locator("#restart").click();
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 30000 })
    .toBe("aim");
  const team1 = await page.evaluate(() =>
    window.siege.getState().worms.filter((worm) => worm.team === 1 && worm.hp > 0).length);
  expect(team1).toBe(3);
});

test("training water is drawn at the landscape bottom", async ({ page }) => {
  await openScenario(page, "mission/training1.wam");
  const state = await page.evaluate(() => {
    const s = window.siege.getState();
    return { level: s.waterLevel, surface: s.waterSurface, target: s.crates.find((c) => c.kind === "target")?.y };
  });
  // The rendered sea must follow the scenario waterline, not the default 80 rows.
  expect(state.level).toBe(0);
  expect(state.surface).toBe(0);
  expect(state.target).toBeGreaterThan(state.surface);
});
