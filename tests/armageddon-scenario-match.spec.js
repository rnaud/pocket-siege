import { test, expect } from "@playwright/test";
import missionNames from "../src/armageddon/mission-names.json" with { type: "json" };
import mapCatalog from "../src/armageddon/map-catalog.json" with { type: "json" };
import { resolveScenarioMatch } from "../src/armageddon/scenario-match.js";
import { originalResourceString } from "../src/armageddon/string-resources.js";

test("every mission and training resolves its original landscape and turn rules", { tag: "@logic" }, () => {
  const terrainIds = new Set(mapCatalog.map((entry) => entry.id));
  const paths = Object.keys(missionNames);
  expect(paths).toHaveLength(48);
  for (const path of paths) {
    const scenario = resolveScenarioMatch(path);
    expect(scenario, path).not.toBeNull();
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
  expect(resolveScenarioMatch("mission/mission0.wam").teamNames[1]).toBe("Patrol");
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
  await expect
    .poll(() => page.evaluate(
      () => window.siege.getState().crates.filter((crate) => crate.scenario).length,
    ))
    .toBeGreaterThan(0);
  expect(await page.evaluate(
    () => window.siege.getState().crates.filter((crate) => !crate.scenario).length,
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
  expect(state.scenario).toMatchObject({ collected: 0 });
  expect(state.scenario.total).toBeGreaterThan(0);
  await expect(page.locator("#scenario-objective")).toContainText("TARGETS 0/");
  expect(await page.evaluate(() => window.siege.debug.collectScenarioCrate())).toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario.collected))
    .toBe(1);
  await expect(page.locator("#scenario-objective")).toContainText("TARGETS 1/");
});


test("training scenario places sequence targets as they are collected", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  const first = page.locator(".frontend-mission-list button").first();
  await expect(first).toBeVisible();
  await first.click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.debug.collectScenarioCrate())).toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario.collected))
    .toBe(1);
});

test("completing a training course resolves the match as a win", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  await page.locator(".frontend-mission-list button").first().click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const total = await page.evaluate(() => window.siege.getState().scenario.total);
  for (let i = 0; i < total; i++) {
    await page.evaluate(() => window.siege.debug.collectScenarioCrate());
    await expect
      .poll(() => page.evaluate(() => window.siege.getState().scenario.collected))
      .toBe(i + 1);
  }
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), {
      timeout: 10000,
    })
    .toBe("over");
  const completed = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-scenario-progress-v1") ?? "[]"));
  expect(completed.length).toBeGreaterThan(0);
  expect(await page.evaluate(() =>
    Object.keys(JSON.parse(localStorage.getItem("pocket-siege-scenario-scores-v1") ?? "{}")).length,
  )).toBeGreaterThan(0);
  const result = await page.evaluate(() => window.siege.getState().lastResult);
  expect(result.scenario).toMatchObject({ complete: true, collected: 2, total: 2 });
  await expect(page.locator("#turn-label")).toHaveText("SCENARIO COMPLETE");
});

test("completing a target-condition mission resolves the match as a win", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator(".frontend-mission-list button").first().click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().scenario.total)).toBe(4);
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.siege.debug.collectScenarioCrate());
    await expect
      .poll(() => page.evaluate(() => window.siege.getState().scenario.collected))
      .toBe(i + 1);
  }
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), {
      timeout: 10000,
    })
    .toBe("over");
  const completed = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-scenario-progress-v1") ?? "[]"));
  expect(completed.length).toBeGreaterThan(0);
});

test("scenario target bonuses update the objective score", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  await page.locator('[data-scenario="mission/training11.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const before = await page.evaluate(() => window.siege.getState().waterLevel);
  await page.evaluate(() => window.siege.debug.triggerSuddenDeath());
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(400));
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const utilityAmmo = await page.evaluate(() => window.siege.getState().utilities);
  expect(utilityAmmo.girder).toBe(3);
  expect(utilityAmmo.rope).toBe(4);
  expect(utilityAmmo.laser).toBe(1);
  expect(utilityAmmo.bungee).toBe(0);
});


test("scenario round time expires into sudden death", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  await page.locator('[data-scenario="mission/training1.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().roundTimeSeconds)).toBe(50);
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(2800));
  expect(await page.evaluate(() => window.siege.getState().suddenDeath)).toBe(true);
});


test("scenario display round time shows a countdown", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  await page.evaluate(() => window.siege.debug.triggerSuddenDeath());
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(600));
  const first = await page.evaluate(() => window.siege.getState().waterLevel);
  for (let i = 0; i < 4; i++)
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
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
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.siege.getState().difficulty)).toBe("rookie");
});


test("mission team names reach the live HUD", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  await expect(page.locator("#team1-name")).toHaveText("Patrol");
});


test("authored mission worm positions reach the live roster", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="missions"]').click();
  await page.locator('[data-scenario="mission/mission0.wam"]').click();
  await page.locator(".frontend-play-scenario").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario?.total ?? 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.worms[0].x).toBeCloseTo(446, 0);
  expect(state.worms[3].x).toBeCloseTo(842, 0);
});
