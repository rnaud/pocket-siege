import { test, expect } from "./helpers/shared-page.js";
import fs from "node:fs";
import fixture from "./fixtures/armageddon/match-trace.json" with { type: "json" };
import { startMatch } from "./helpers/match.js";

// The whole script runs inside the page in one evaluate: the simulation is
// paused and advanced with the debug stepper, so there is nothing to wait for
// between steps and no per-snapshot round trips.
const scriptedTrace = () => {
  const debug = window.siege.debug;
  const snapshot = () => {
    const s = window.siege.getState();
    return {
      team: s.team,
      round: s.round,
      current: s.current,
      phase: s.phase,
      water: Math.round(s.waterLevel),
      wind: Math.round(s.wind),
      worms: s.worms.map((w) => [w.team, w.hp, Math.round(w.x), Math.round(w.y)]),
      projectile: s.projectile
        ? { kind: s.projectile.kind, x: Math.round(s.projectile.x), y: Math.round(s.projectile.y),
            walkTicks: s.projectile.walkTicks ?? 0, burrowDepth: s.projectile.burrowDepth ?? 0 }
        : null,
      crates: s.crates.map((c) => [c.kind, Math.round(c.x), Math.round(c.y)]),
    };
  };
  debug.setSimulationPaused(true);
  debug.resetSeed(20261119);
  const trace = [];
  const capture = (label) => trace.push([label, snapshot()]);
  capture("start");
  debug.spawnUnitAt("sheep", 600);
  debug.advanceReplayFrames(80);
  capture("sheep");
  debug.explodeAt(700, 400, "cluster");
  debug.advanceReplayFrames(200);
  capture("cluster");
  debug.finishTurn();
  debug.advanceReplayFrames(200);
  capture("turn");
  debug.spawnUnitAt("molebomb", 800);
  debug.advanceReplayFrames(120);
  capture("mole");
  const waterY = window.siege.getState().waterLevel - 4;
  debug.spawnUnitAt("aquasheep", 600, waterY);
  debug.advanceReplayFrames(40);
  capture("aqua");
  debug.spawnUnitAt("supersheep", 600, waterY + 160);
  debug.advanceReplayFrames(40);
  capture("super");
  debug.spawnUnitAt("donkey", 1850);
  debug.advanceReplayFrames(40);
  capture("edge");
  return trace;
};

const runTrace = async (page) => {
  await startMatch(page, { map: "fern" });
  return page.evaluate(scriptedTrace);
};

test("deterministic match trace baseline (host)", async ({ browser }) => {
  // Two complete scripted traces in fresh pages, booted side by side.
  const pages = await Promise.all([browser.newPage(), browser.newPage()]);
  try {
    const [trace, repeat] = await Promise.all(pages.map(runTrace));
    if (process.env.UPDATE_MATCH_TRACE) {
      fs.writeFileSync(new URL("./fixtures/armageddon/match-trace.json", import.meta.url),
        JSON.stringify(trace, null, 2) + "\n");
    } else {
      expect(trace).toEqual(fixture);
    }
    expect(trace).toEqual(repeat);
  } finally {
    await Promise.all(pages.map((page) => page.close()));
  }
});
