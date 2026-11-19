const STORAGE_KEY = "pocket-siege-scenario-progress-v1";
const SCORE_KEY = "pocket-siege-scenario-scores-v1";

// Local, offline progression only. Unknown or malformed entries are ignored
// rather than clearing the player's other completions.
export function readScenarioProgress(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((path) => typeof path === "string") : []);
  } catch {
    return new Set();
  }
}

export function isScenarioComplete(path, storage = globalThis.localStorage) {
  return readScenarioProgress(storage).has(path);
}

export function readScenarioScores(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(SCORE_KEY) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return new Map();
    return new Map(Object.entries(value).filter(([path, score]) =>
      typeof path === "string" && Number.isFinite(Number(score))));
  } catch {
    return new Map();
  }
}

export function recordScenarioScore(path, score, storage = globalThis.localStorage) {
  if (typeof path !== "string" || !path || !Number.isFinite(Number(score))) return false;
  const scores = readScenarioScores(storage);
  const next = Math.max(0, Math.trunc(Number(score)));
  if ((scores.get(path) ?? -1) >= next) return false;
  scores.set(path, next);
  storage.setItem(SCORE_KEY, JSON.stringify(Object.fromEntries(
    [...scores.entries()].sort(([a], [b]) => a.localeCompare(b)))));
  return true;
}

export function recordScenarioCompletion(path, storage = globalThis.localStorage) {
  if (typeof path !== "string" || !path) return false;
  const completed = readScenarioProgress(storage);
  if (completed.has(path)) return false;
  completed.add(path);
  storage.setItem(STORAGE_KEY, JSON.stringify([...completed].sort()));
  return true;
}
