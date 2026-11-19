import { test, expect } from "@playwright/test";
import missionNames from "../src/armageddon/mission-names.json" with { type: "json" };
import mapCatalog from "../src/armageddon/map-catalog.json" with { type: "json" };
import { resolveScenarioMatch } from "../src/armageddon/scenario-match.js";

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
  expect(resolveScenarioMatch("mission/mission5.wam").objects.filter((object) => object.kind === "health")).toHaveLength(2);
  expect(resolveScenarioMatch("mission/training1.wam").sequenceObjects).toHaveLength(1);
  expect(resolveScenarioMatch("mission/training1.wam").sequenceObjects[0]).toMatchObject({
    kind: "target", x: 1066, y: 434, marked: true,
  });
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
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.phase).toBe("aim");
  expect(state.turnTime).toBe(45);
  expect(state.retreatSeconds).toBe(3);
  await expect
    .poll(() => page.evaluate(
      () => window.siege.getState().crates.filter((crate) => crate.scenario).length,
    ))
    .toBeGreaterThan(0);
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
  expect(await page.evaluate(() => window.siege.debug.collectScenarioCrate())).toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().scenario.collected))
    .toBe(1);
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
});
