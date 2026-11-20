import { test, expect } from "@playwright/test";

const snapshot = (page) => page.evaluate(() => {
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
});

const runTrace = async (page) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await page.evaluate(() => { window.siege.debug.setSimulationPaused(true); window.siege.debug.resetSeed(20261119); });
  const trace = [];
  const capture = async (label) => trace.push([label, await snapshot(page)]);
  await capture("start");
  await page.evaluate(() => window.siege.debug.spawnUnitAt("sheep", 600));
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(80));
  await capture("sheep");
  await page.evaluate(() => window.siege.debug.explodeAt(700, 400, "cluster"));
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(200));
  await capture("cluster");
  await page.evaluate(() => window.siege.debug.finishTurn());
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(200));
  await capture("turn");
  await page.evaluate(() => window.siege.debug.spawnUnitAt("molebomb", 800));
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(120));
  await capture("mole");
  const waterY = await page.evaluate(() => window.siege.getState().waterLevel - 4);
  await page.evaluate((y) => window.siege.debug.spawnUnitAt("aquasheep", 600, y), waterY);
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(40));
  await capture("aqua");
  await page.evaluate((y) => window.siege.debug.spawnUnitAt("supersheep", 600, y), waterY + 160);
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(40));
  await capture("super");
  await page.evaluate(() => window.siege.debug.spawnUnitAt("donkey", 1850));
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(40));
  await capture("edge");
  return trace;
};

test("deterministic match trace baseline (host)", async ({ browser }) => {
  const first = await browser.newPage();
  const second = await browser.newPage();
  try {
    expect(await runTrace(first)).toEqual(await runTrace(second));
  } finally {
    await first.close();
    await second.close();
  }
});
