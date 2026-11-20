import { test, expect } from "@playwright/test";
// Split from armageddon-scenario-match: the import keeps these browser checks
// selected (CI and pre-commit follow Node imports) when the resolver changes.
import "../src/armageddon/scenario-match.js";
import "../src/armageddon/scenario-water.js";
import { openScenario, advanceUntil, runOutRoundTime } from "./helpers/scenario-page.js";

test("scenario water sudden death raises the sea", async ({ page }) => {
  await openScenario(page, "mission/mission0.wam");
  const before = await page.evaluate(() => window.siege.getState().waterLevel);
  await page.evaluate(() => window.siege.debug.triggerSuddenDeath());
  // 004B72E1: the sea rises on the next between-turn pass, not at onset.
  await page.evaluate(() => {
    for (let pass = 0; pass < 4; pass++) {
      window.siege.debug.finishTurn();
      window.siege.debug.advanceReplayFrames(300);
    }
  });
  expect(await page.evaluate(() => window.siege.getState().waterLevel)).toBeGreaterThan(before);
});

test("scenario sudden-death worm damage drains health each turn", async ({ page }) => {
  await openScenario(page, "mission/mission0.wam");
  await page.evaluate(() => window.siege.debug.triggerSuddenDeath());
  const before = await page.evaluate(() =>
    window.siege.getState().worms.map((worm) => worm.hp));
  expect(await page.evaluate(() => window.siege.debug.applySuddenDeathDamage())).toBe(true);
  const after = await page.evaluate(() =>
    window.siege.getState().worms.map((worm) => worm.hp));
  expect(after.some((hp, index) => hp < before[index])).toBe(true);
});

test("scenario water sudden death rises again on later rounds", async ({ page }) => {
  await openScenario(page, "mission/mission0.wam");
  await page.evaluate(() => window.siege.debug.triggerSuddenDeath());
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(600));
  const first = await page.evaluate(() => window.siege.getState().waterLevel);
  for (let i = 0; i < 12; i++)
    await page.evaluate(() => window.siege.debug.finishTurn());
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(600));
  const second = await page.evaluate(() => window.siege.getState().waterLevel);
  expect(second).toBeGreaterThan(first);
});

test("mission round time with a sudden-death event expires into sudden death", async ({ page }) => {
  // Mission 30 sets SuddenDeathType 3 with a two-minute round and no vital objects.
  await openScenario(page, "mission/mission30.wam", { aim: false });
  expect(await page.evaluate(() => window.siege.getState().roundTimeSeconds)).toBe(120);
  // Run out the round in logic frames (20 ms each).
  await runOutRoundTime(page);
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

test("mission Nuclear Test raises the sea by weapon 55's water rise and poisons worms", async ({ page }) => {
  await openScenario(page, "mission/mission1.wam");
  const before = await page.evaluate(() => window.siege.getState().waterLevel);
  expect(await page.evaluate(() => window.siege.debug.missionEvent({ type: 8 }))).toBe(true);
  // 004FC8D0 / 004EF6B0 type 8: 0x441 {entry +0x70 = 120, 8}, 0x439 {entry +0x74 = 2}.
  await advanceUntil(page, (state, level) => state.waterLevel >= level, { arg: before + 119, step: 10, max: 2000,
    label: "water rise" });
  expect(await page.evaluate(() =>
    window.siege.getState().worms.filter((worm) => worm.hp > 0).every((worm) => worm.nativePoison.amount >= 2)))
    .toBe(true);
});

// Sudden-death types 2 and 3 are checked in armageddon-scenario-rules.
