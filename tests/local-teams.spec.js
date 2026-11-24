import { test, expect } from "./helpers/shared-page.js";
import { nextSeriesWins, seriesWinner } from "../src/series.js";
import { clampTeamCount, teamColor, teamFontName, teamSpriteSuffix } from "../src/teams.js";

test("extra local teams map to the native blue and yellow palettes", { tag: "@logic" }, () => {
  expect([0, 1, 2, 3].map(teamColor)).toEqual([2, 0, 1, 3]);
  expect([0, 1, 2, 3].map((t) => teamSpriteSuffix(t))).toEqual(["g", "r", "b", "y"]);
  expect([0, 1, 2, 3].map((t) => teamFontName(t))).toEqual(["stdgrn1", "stdred1", "stdblu1", "stdyel1"]);
  expect([1, 2, 4, 5, "x"].map(clampTeamCount)).toEqual([2, 2, 4, 4, 2]);
  expect(seriesWinner(nextSeriesWins([0, 1, 1, 0], 2))).toBe(2);
  expect(seriesWinner([1, 1, 1, 1])).toBe(null);
});

// Four local teams, one of them the computer: turns rotate through every team,
// the CPU plays its own turn, eliminated teams are skipped and the last team
// standing wins.
test("four-team pass and play rotates, skips eliminated teams and crowns the survivor", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady, null, { polling: 10 });
  const result = await page.evaluate(async () => {
    const set = (id, value) => {
      const el = document.querySelector(id);
      el.value = value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set("#mode", "local");
    set("#team-count", "4");
    for (const [t, value] of ["human", "human", "human", "cpu"].entries()) set(`#team-control-${t}`, value);
    const d = window.siege.debug;
    await d.startMatch({ mode: "local", map: "fern", seed: 7, manualClock: true });
    const settle = () => {
      for (let i = 0; i < 6000 && !["aim", "over"].includes(window.siege.getState().phase); i++) d.advanceReplayFrames(1);
    };
    const next = () => {
      const from = window.siege.getState().team;
      for (let k = 0; k < 4 && window.siege.getState().team === from && window.siege.getState().phase !== "over"; k++) {
        d.finishTurn();
        settle();
      }
      return window.siege.getState().team;
    };
    const state = window.siege.getState();
    const rosters = [0, 1, 2, 3].map((t) => state.worms.filter((w) => w.team === t).length);
    const order = [state.team, next(), next(), next()];
    const cpuLabel = document.querySelector("#turn-label").textContent;
    // The CPU fires on its own; wait until it hands the turn on.
    for (let i = 0; i < 60 * 60 && window.siege.getState().team === 3; i++) d.advanceReplayFrames(1);
    settle();
    const afterCpu = window.siege.getState();
    d.hit(1, 300);
    d.hit(2, 300);
    const skipped = [next(), next()];
    d.hit(3, 300);
    next();
    const end = window.siege.getState();
    return {
      teamCount: state.teamCount, controllers: state.teamControllers, rosters, order, cpuLabel,
      afterCpu: { team: afterCpu.team, round: afterCpu.round }, skipped,
      phase: end.phase, winner: end.lastResult?.winner, winnerName: end.lastResult?.winnerName,
      score: end.lastResult?.score,
    };
  });
  expect(result.teamCount).toBe(4);
  expect(result.controllers).toEqual(["human", "human", "human", "cpu"]);
  expect(result.rosters).toEqual([3, 3, 3, 3]);
  expect(result.order).toEqual([0, 1, 2, 3]);
  expect(result.cpuLabel).toContain("AMBER");
  expect(result.afterCpu.team).not.toBe(3);
  expect(result.afterCpu.round).toBe(2);
  expect(result.skipped.every((t) => t === 0 || t === 3)).toBe(true);
  expect(result.phase).toBe("over");
  expect(result.winner).toBe(0);
  expect(result.winnerName).toBe("MOSS COMPANY");
  expect(result.score).toHaveLength(4);
});
