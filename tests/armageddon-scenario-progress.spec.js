import { test, expect } from "@playwright/test";
import {
  readScenarioProgress,
  isScenarioComplete,
  recordScenarioCompletion,
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
