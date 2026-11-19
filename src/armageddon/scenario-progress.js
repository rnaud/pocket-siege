const STORAGE_KEY = "pocket-siege-scenario-progress-v1";

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

export function recordScenarioCompletion(path, storage = globalThis.localStorage) {
  if (typeof path !== "string" || !path) return false;
  const completed = readScenarioProgress(storage);
  if (completed.has(path)) return false;
  completed.add(path);
  storage.setItem(STORAGE_KEY, JSON.stringify([...completed].sort()));
  return true;
}
