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

const ATTEMPT_KEY = "pocket-siege-scenario-attempts-v1";
const MEDAL_KEY = "pocket-siege-scenario-medals-v1";
function readNumberMap(key, storage) {
  try {
    const value = JSON.parse(storage.getItem(key) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, n]) => Number.isInteger(n) && n >= 0));
  } catch {
    return {};
  }
}

// Failed attempts per mission (frontend byte 0x6f5288 + slot*8). Mission
// Retries fields compare against this count when the script is loaded.
export function readScenarioAttempts(path, storage = globalThis.localStorage) {
  return readNumberMap(ATTEMPT_KEY, storage)[path] ?? 0;
}

export function recordScenarioFailure(path, storage = globalThis.localStorage) {
  if (typeof path !== "string" || !path) return 0;
  const attempts = readNumberMap(ATTEMPT_KEY, storage);
  attempts[path] = Math.min(255, (attempts[path] ?? 0) + 1);
  storage.setItem(ATTEMPT_KEY, JSON.stringify(attempts));
  return attempts[path];
}

// Medal status (0x6f528c + slot*8): 3 gold, 2 silver, 1 bronze.
export function readScenarioMedal(path, storage = globalThis.localStorage) {
  return readNumberMap(MEDAL_KEY, storage)[path] ?? 0;
}

export function recordScenarioMedal(path, medal, storage = globalThis.localStorage) {
  if (typeof path !== "string" || !path) return 0;
  const medals = readNumberMap(MEDAL_KEY, storage);
  medals[path] = Math.max(medals[path] ?? 0, medal | 0);
  storage.setItem(MEDAL_KEY, JSON.stringify(medals));
  return medals[path];
}

// 00444209: a successful mission clears its failed-attempt counter.
export function resetScenarioAttempts(path, storage = globalThis.localStorage) {
  const attempts = readNumberMap(ATTEMPT_KEY, storage);
  if (!(path in attempts)) return;
  delete attempts[path];
  storage.setItem(ATTEMPT_KEY, JSON.stringify(attempts));
}

// 0044359D/00444F7A: the mission menu reaches mission 0 through the first
// mission whose status is still 0 (00478BB0); completing it raises the bound.
// Trainings use their own menu and stay open.
export const UNLOCK_ALL_KEY = "pocket-siege-unlock-all-missions";
export function scenarioMissionBound(paths, storage = globalThis.localStorage) {
  if (storage.getItem(UNLOCK_ALL_KEY) === "1") return Infinity;
  const completed = readScenarioProgress(storage);
  const medals = readNumberMap(MEDAL_KEY, storage);
  const index = paths.findIndex(path => !completed.has(path) && !(medals[path] > 0));
  return index < 0 ? paths.length - 1 : index;
}
