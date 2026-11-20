import { test, expect } from "@playwright/test";
// Split from armageddon-scenario-match: the import keeps these browser checks
// selected (CI and pre-commit follow Node imports) when the resolver changes.
import "../src/armageddon/scenario-match.js";
import { openScenario, advanceUntil, runOutRoundTime } from "./helpers/scenario-page.js";

// Targets are destroyed by native blast packets; worms cannot collect them.
async function destroyTarget(page) {
  // The sequence places the next target on a later frame.
  await page.waitForFunction(() =>
    Boolean(window.siege.getState().crates.find((crate) => crate.mission?.target)), null, { timeout: 10000 });
  const target = await page.evaluate(() =>
    window.siege.getState().crates.find((crate) => crate.mission?.target));
  await page.evaluate(([x, y]) => window.siege.debug.nativeBlastAt(x, y), [target.x, target.y]);
}

test("training sequences place each target after the previous one is destroyed", async ({ page }) => {
  await openScenario(page, "mission/training1.wam");
  const first = await page.evaluate(() => window.siege.getState().crates);
  expect(first.map((crate) => crate.kind)).toEqual(["target"]);
  expect(first[0].nativeBody.kind).toBe(3);
  expect(await page.evaluate(() => window.siege.debug.collectScenarioCrate())).toBe(false);
  await destroyTarget(page);
  await advanceUntil(page, (state) => state.scenario.collected === 1, { label: "first target" });
  expect(await page.evaluate(() => window.siege.getState().scenario)).toMatchObject({ collected: 1, total: 2 });
  const second = await page.evaluate(() => window.siege.getState().crates);
  expect(second).toHaveLength(1);
  expect(Math.round(second[0].x)).not.toBe(Math.round(first[0].x));
});

test("completing a training course resolves the match as a win", async ({ page }) => {
  // A controllable clock skips the host's fixed delay before the front end
  // reopens; until then it follows real time.
  await page.clock.install();
  await openScenario(page, "mission/training1.wam");
  for (let i = 0; i < 2; i++) {
    await destroyTarget(page);
    await page.waitForFunction((count) => window.siege.getState().scenario.collected === count, i + 1);
  }
  // The result is resolved in real frames so the host schedules its return.
  await page.waitForFunction(() => window.siege.getState().phase === "over", null, { timeout: 10000 });
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
  await page.clock.fastForward(3000);
  await expect(page.locator("#menu")).toHaveAttribute("open", "", { timeout: 10000 });
  await expect(page.locator("#menu")).toHaveAttribute("data-frontend-mode", "training");
  await expect(page.locator('[data-scenario="mission/training1.wam"]')).toHaveAttribute("aria-pressed", "true");
});

test("collecting a mission's vital crate completes WinningCondition 3", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("pocket-siege-scenario-attempts-v1", JSON.stringify({ "mission/mission0.wam": 2 }));
    }
  });
  await openScenario(page, "mission/mission0.wam");
  expect(await page.evaluate(() => window.siege.debug.collectScenarioCrate())).toBe(true);
  await advanceUntil(page, (state) => state.phase === "over", { step: 5, label: "match over" });
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
  await advanceUntil(page, (state) => state.phase === "over", { step: 5, label: "match over" });
  await expect(page.locator("#turn-label")).toHaveText("SCENARIO OVER");
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-scenario-attempts-v1") ?? "{}")["mission/mission0.wam"],
  )).toBe(1);
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-scenario-progress-v1") ?? "[]"))).toEqual([]);
});

test("scenario target bonuses update the objective score", async ({ page }) => {
  await openScenario(page, "mission/training11.wam");
  expect(await page.evaluate(() => window.siege.debug.collectScenarioCrate())).toBe(true);
  await advanceUntil(page, (state) => state.scenario.score > 0, { label: "objective score" });
});

test("training round time-out ends the run after the turn", async ({ page }) => {
  // Trainings omit SuddenDeathType, so 00417278 sets scene 0x11d5d.
  await openScenario(page, "mission/training1.wam");
  expect(await page.evaluate(() => window.siege.getState().roundTimeSeconds)).toBe(50);
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(2800));
  expect(await page.evaluate(() => window.siege.getState().suddenDeath)).toBe(false);
  for (let i = 0; i < 4; i++) await page.evaluate(() => window.siege.debug.finishTurn());
  await advanceUntil(page, (state) => state.phase === "over", { step: 5, label: "match over" });
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-scenario-attempts-v1") ?? "{}")["mission/training1.wam"],
  )).toBe(1);
});

test("scenario turn-end-finishes-game resolves when the turn expires", async ({ page }) => {
  await openScenario(page, "mission/training11.wam");
  // Run out the round in logic frames (20 ms each).
  await runOutRoundTime(page);
  await page.evaluate(() => window.siege.debug.finishTurn());
  await advanceUntil(page, (state) => state.phase === "over", { step: 5, label: "match over" });
});

test("an eliminated scenario does not report objective completion", async ({ page }) => {
  await openScenario(page, "mission/mission0.wam");
  await page.evaluate(() => window.siege.debug.knockout(1));
  await expect(page.locator("#turn-label")).toHaveText("SCENARIO OVER");
  expect(await page.evaluate(() => window.siege.getState().lastResult.scenario.complete)).toBe(false);
});

test("eliminating the player ends the mission as a failure", async ({ page }) => {
  // 004B39A0 modes 2/3 end the game once no human alliance survives.
  await openScenario(page, "mission/mission1.wam");
  await page.evaluate(() => window.siege.debug.knockout(0));
  await advanceUntil(page, (state) => state.phase === "over", { step: 5, label: "match over" });
  await expect(page.locator("#turn-label")).toHaveText("SCENARIO OVER");
  expect(await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pocket-siege-scenario-attempts-v1") ?? "{}")["mission/mission1.wam"],
  )).toBe(1);
});
