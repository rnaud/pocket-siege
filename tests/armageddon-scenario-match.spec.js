import { test, expect } from "./helpers/shared-page.js";
import { startMatch } from "./helpers/match.js";
import missionNames from "../src/armageddon/mission-names.json" with { type: "json" };
import mapCatalog from "../src/armageddon/map-catalog.json" with { type: "json" };
import { resolveScenarioMatch } from "../src/armageddon/scenario-match.js";
import { nativeInitialWaterY, nativeScenarioWaterLevel } from "../src/armageddon/scenario-water.js";
import { originalResourceString } from "../src/armageddon/string-resources.js";
import { openScenario, sharedScenario, advanceUntil } from "./helpers/scenario-page.js";

// Scenario specs are split by theme: objectives and results live in
// armageddon-scenario-objectives, scheme options in armageddon-scenario-rules
// and armageddon-scenario-sudden-death, rosters in armageddon-scenario-roster.

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

test("scenario waterline follows Landgen's default water percentage", { tag: "@logic" }, () => {
  expect(nativeInitialWaterY(0)).toBe(696);
  expect(nativeInitialWaterY(50)).toBe(348);
  expect(nativeScenarioWaterLevel(696)).toBe(0);
});

test("an ordinary match on an original image map starts with the sea at the bottom edge", async ({ page }) => {
  // WA builds /custom and /mission LANDGEN commands without /water.
  await startMatch(page, { map: "original:mission/mission6.img", seed: 3 });
  expect(await page.evaluate(() => window.siege.getState().waterLevel)).toBe(0);
});

test("repeated WAM keys keep their first profile value", { tag: "@logic" }, () => {
  expect(resolveScenarioMatch("mission/training8.wam").teamWorms[0][0]).toMatchObject({ x: 328, y: 630 });
  expect(resolveScenarioMatch("mission/training5.wam").teamWorms[0][0]).toMatchObject({ x: 63, y: 615 });
});

test("campaign scenario starts on its original landscape and turn rules", async ({ page }) => {
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
  await page.waitForFunction(() => {
    const state = window.siege.getState();
    return Boolean(state.scenario) && state.phase === "aim";
  }, null, { timeout: 30000 });
  expect(await page.evaluate(() => window.siege.getState().mapLayout)).toMatch(/^original:mission\/.+\.img$/);
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.turnTime).toBe(45);
  expect(state.retreatSeconds).toBe(3);
  // Mission 0 places a weapon crate and a Marked, Vital weapon crate, plus
  // authored mines and hazards.
  await page.waitForFunction(() => {
    const s = window.siege.getState();
    return s.crates.filter((crate) => crate.mission).length === 2 &&
      s.mines.some((mine) => mine.scenario) && s.hazards.some((hazard) => hazard.scenario);
  });
  expect(await page.evaluate(
    () => window.siege.getState().crates.filter((crate) => !crate.mission).length,
  )).toBe(0);
  expect(state.scenario).toMatchObject({ collected: 0, total: 1 });
  await expect(page.locator("#scenario-objective")).toContainText("TARGETS 0/1");
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

for (const path of ["mission/mission0.wam", "mission/training1.wam"])
test(`mission and training runtime smoke without opt-in playthrough (${path})`, async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openScenario(page, path);
  for (let i = 0; i < 2; i++)
    await page.evaluate(() => window.siege.debug.finishTurn());
  await advanceUntil(page, (state) => (state.mission?.turn ?? 0) > 0, { label: "mission turn" });
  expect(errors, path).toEqual([]);
});

test("single-team trainings field no CPU worms and keep the player's turn", async ({ page }) => {
  await openScenario(page, "mission/training1.wam");
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
  await advanceUntil(page, (state) => state.phase === "aim", { step: 10, label: "next aim" });
  expect(await page.evaluate(() => window.siege.getState().team)).toBe(0);
  await page.evaluate(() => window.siege.debug.knockout(0));
  await expect.poll(() => page.evaluate(() => window.siege.getState().phase)).toBe("over");
});

test("starting a local match after a training restores both teams", async ({ page }) => {
  await openScenario(page, "mission/training1.wam");
  await page.locator("#restart").click();
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await page.waitForFunction(() => !document.querySelector("#menu").open && window.siege.getState().phase === "aim",
    null, { timeout: 30000 });
  const team1 = await page.evaluate(() =>
    window.siege.getState().worms.filter((worm) => worm.team === 1 && worm.hp > 0).length);
  expect(team1).toBe(3);
});

sharedScenario("mission/training1.wam", (shared) => {
  test("scenario logic random seed drives the live match RNG", async () => {
    const page = shared();
    expect(await page.evaluate(() => window.siege.getState().randomSeed)).toBe(3482743);
  });
  test("training water is drawn at the landscape bottom", async () => {
    const page = shared();
    const state = await page.evaluate(() => {
      const s = window.siege.getState();
      return { level: s.waterLevel, surface: s.waterSurface, target: s.crates.find((c) => c.kind === "target")?.y };
    });
    // The rendered sea must follow the scenario waterline, not the default 80 rows.
    expect(state.level).toBe(0);
    expect(state.surface).toBe(0);
    expect(state.target).toBeGreaterThan(state.surface);
  });
  test("training 1 starts its low ledge worm above the scenario waterline", async () => {
    const page = shared();
    // Let the worm settle for a second of simulation.
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(50));
    const state = await page.evaluate(() => window.siege.getState());
    expect(state.waterLevel).toBe(0);
    expect(state.phase).toBe("aim");
    expect(state.worms[0]).toMatchObject({ team: 0, hp: 1 });
    expect(state.worms[0].y).toBeGreaterThan(state.waterLevel);
  });
});
