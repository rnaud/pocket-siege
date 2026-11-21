import { test, expect } from "./helpers/shared-page.js";
import {
  readScenarioProgress,
  isScenarioComplete,
  recordScenarioCompletion,
  readScenarioScores,
  recordScenarioScore,
} from "../src/armageddon/scenario-progress.js";

function memoryStorage(initial = null) {
  const values = new Map();
  if (initial !== null) values.set("pocket-siege-scenario-progress-v1", initial);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
}

test("scenario completion persists locally and ignores malformed storage", { tag: "@logic" }, () => {
  const storage = memoryStorage();
  expect(readScenarioProgress(storage)).toEqual(new Set());
  expect(recordScenarioCompletion("mission/mission0.wam", storage)).toBe(true);
  expect(recordScenarioCompletion("mission/mission0.wam", storage)).toBe(false);
  expect(recordScenarioCompletion("mission/training1.wam", storage)).toBe(true);
  expect(isScenarioComplete("mission/mission0.wam", storage)).toBe(true);
  expect(readScenarioProgress(storage).size).toBe(2);
  const malformed = memoryStorage("{");
  expect(readScenarioProgress(malformed)).toEqual(new Set());
  expect(recordScenarioCompletion("", storage)).toBe(false);
});

test("scenario best scores persist and only improve", { tag: "@logic" }, () => {
  const storage = memoryStorage();
  expect(readScenarioScores(storage).size).toBe(0);
  expect(recordScenarioScore("mission/mission0.wam", 4, storage)).toBe(true);
  expect(recordScenarioScore("mission/mission0.wam", 3, storage)).toBe(false);
  expect(recordScenarioScore("mission/mission0.wam", 7, storage)).toBe(true);
  expect(readScenarioScores(storage).get("mission/mission0.wam")).toBe(7);
  expect(recordScenarioScore("", 1, storage)).toBe(false);
});

test("campaign header reports locally completed scenario counts", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pocket-siege-scenario-progress-v1",
      JSON.stringify(["mission/training1.wam"]));
  });
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="training"]').click();
  await expect(page.locator(".frontend-campaign h2")).toContainText("1/15 COMPLETE");
});
