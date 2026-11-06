import { test, expect } from "@playwright/test";
import {
  applyMatchResult,
  dailySeed,
  dailyStatus,
  defaultRecord,
  readRecord,
  recordBest,
  recordSummary,
  writeRecord,
} from "../src/progress.js";
import { nextSeriesWins, seriesWinner } from "../src/series.js";
import { applyPickup } from "../src/pickups.js";

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
  };
}

test("record defaults, round trips and survives malformed storage", () => {
  const storage = fakeStorage();
  expect(readRecord(storage)).toEqual(defaultRecord());
  const won = applyMatchResult(defaultRecord(), { won: true, ai: true });
  writeRecord(won, storage);
  expect(readRecord(storage).wins).toBe(1);
  expect(recordSummary(won)).toContain("1W–0L");
  storage.setItem("pocket-siege-record-v1", "{not json");
  expect(readRecord(storage)).toEqual(defaultRecord());
});

test("daily seed is stable per day and changes the next day", () => {
  const a = dailySeed(new Date(2026, 0, 2)),
    b = dailySeed(new Date(2026, 0, 2)),
    c = dailySeed(new Date(2026, 0, 3));
  expect(a).toEqual(b);
  expect(a.key).toBe("2026-01-02");
  expect(a.seed).toBeGreaterThanOrEqual(100);
  expect(a.seed).toBeLessThan(1000);
  expect(c.key).not.toBe(a.key);
  expect(c.seed).not.toBe(a.seed);
});

test("match results update streaks, daily status and local play counts", () => {
  const base = defaultRecord();
  const win = applyMatchResult(base, { won: true, ai: true });
  expect(win).toMatchObject({ played: 1, wins: 1, losses: 0, streak: 1 });
  const second = applyMatchResult(win, { won: true, ai: true });
  expect(second).toMatchObject({ wins: 2, streak: 2, bestStreak: 2 });
  const loss = applyMatchResult(second, { won: false, ai: true });
  expect(loss).toMatchObject({ wins: 2, losses: 1, streak: 0, bestStreak: 2 });
  const local = applyMatchResult(base, { ai: false });
  expect(local).toMatchObject({ played: 1, wins: 0, losses: 0 });
  const draw = applyMatchResult(base, { ai: true, draw: true });
  expect(draw).toMatchObject({ played: 1, wins: 0, losses: 0 });
  const daily = applyMatchResult(base, {
    won: true,
    ai: true,
    daily: true,
    dateKey: "2026-01-02",
  });
  expect(daily.daily).toEqual({ date: "2026-01-02", won: true });
  expect(dailyStatus(daily, "2026-01-02")).toBe("TODAY: WON");
  expect(dailyStatus(daily, "2026-01-03")).toBe("ONE SEEDED ISLAND A DAY");
});

test("personal bests only move upward", () => {
  const first = recordBest(defaultRecord(), { bestHit: 64.4, longest: 512.8 });
  expect(first.bestHit).toBe(64);
  expect(first.longest).toBe(513);
  const lower = recordBest(first, { bestHit: 20, longest: 100 });
  expect(lower.bestHit).toBe(64);
  expect(lower.longest).toBe(513);
});

test("series wins reach a two-win target and ignore invalid winners", () => {
  let wins = [0, 0];
  wins = nextSeriesWins(wins, 0);
  expect(wins).toEqual([1, 0]);
  expect(seriesWinner(wins)).toBeNull();
  wins = nextSeriesWins(wins, 1);
  wins = nextSeriesWins(wins, 0);
  expect(wins).toEqual([2, 1]);
  expect(seriesWinner(wins)).toBe(0);
  expect(nextSeriesWins([0, 0], null)).toEqual([0, 0]);
});

test("pickups heal with a cap and add limited ammo without mutating the loadout", () => {
  const loadout = { grenade: 2, mortar: 2, sticky: 2 };
  expect(applyPickup("health", 50, loadout)).toEqual({
    hp: 75,
    loadout,
  });
  expect(applyPickup("health", 90, loadout).hp).toBe(100);
  const ammo = applyPickup("grenade", 50, loadout);
  expect(ammo.loadout.grenade).toBe(3);
  expect(loadout.grenade).toBe(2);
  expect(applyPickup("mortar", 50, { mortar: 9 }).loadout.mortar).toBe(9);
});
