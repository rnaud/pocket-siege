const KEY = "pocket-siege-record-v1";

export function defaultRecord() {
  return {
    played: 0,
    wins: 0,
    losses: 0,
    streak: 0,
    bestStreak: 0,
    bestHit: 0,
    longest: 0,
    daily: { date: "", won: null },
  };
}

function getStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readRecord(storage) {
  try {
    const parsed = JSON.parse(getStorage(storage)?.getItem(KEY) || "null");
    if (!parsed || typeof parsed !== "object") return defaultRecord();
    const base = defaultRecord();
    return {
      ...base,
      ...parsed,
      played: Number(parsed.played) || 0,
      wins: Number(parsed.wins) || 0,
      losses: Number(parsed.losses) || 0,
      streak: Number(parsed.streak) || 0,
      bestStreak: Number(parsed.bestStreak) || 0,
      bestHit: Number(parsed.bestHit) || 0,
      longest: Number(parsed.longest) || 0,
      daily: { ...base.daily, ...(parsed.daily || {}) },
    };
  } catch {
    return defaultRecord();
  }
}

export function writeRecord(record, storage) {
  try {
    getStorage(storage)?.setItem(KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function dailySeed(date = new Date()) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return { key, seed: (Math.abs(hash) % 900) + 100 };
}

export function applyMatchResult(
  record,
  { won = false, ai = false, daily = false, dateKey = "", draw = false } = {},
) {
  const next = { ...record, daily: { ...record.daily } };
  next.played += 1;
  if (!draw && (ai || daily)) {
    if (won) {
      next.wins += 1;
      next.streak += 1;
      next.bestStreak = Math.max(next.bestStreak, next.streak);
    } else {
      next.losses += 1;
      next.streak = 0;
    }
  }
  if (daily) next.daily = { date: dateKey, won: draw ? null : Boolean(won) };
  return next;
}

export function recordBest(record, { bestHit = 0, longest = 0 } = {}) {
  const next = { ...record };
  if (bestHit > next.bestHit) next.bestHit = Math.round(bestHit);
  if (longest > next.longest) next.longest = Math.round(longest);
  return next;
}

export function recordSummary(record) {
  if (!record.played) return "FIRST MATCH · YOUR RECORD STARTS HERE";
  return `${record.wins}W–${record.losses}L · STREAK ${record.streak} · BEST HIT ${record.bestHit} · LONGEST ${record.longest}`;
}

export function dailyStatus(record, todayKey = dailySeed().key) {
  if (record.daily.date !== todayKey) return "ONE SEEDED ISLAND A DAY";
  if (record.daily.won === true) return "TODAY: WON";
  if (record.daily.won === false) return "TODAY: LOST";
  return "TODAY: DRAW";
}
