import { test, expect } from "./helpers/shared-page.js";
import missionNames from "../src/armageddon/mission-names.json" with { type: "json" };
test.describe.configure({ mode: "parallel" });
// Plays every scenario's scripted turns (about 6 minutes on 4 workers).
// Run with MISSION_PLAYTHROUGH=1; it is excluded from routine CI.
test.skip(!process.env.MISSION_PLAYTHROUGH, "set MISSION_PLAYTHROUGH=1 to play every scenario's scripted turns");
for (const id of Object.keys(missionNames)) test(`play ${id}`, async ({ page }) => {
  test.setTimeout(240000);
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator(`[data-mode="${id.includes("training") ? "training" : "missions"}"]`).click();
  await page.locator(`[data-scenario="${id}"]`).click();
  await page.locator(".frontend-play-scenario").click();
  await page.waitForFunction(() => { const s = window.siege.getState(); return s.scenario && (s.phase === "aim" || s.phase === "over"); }, null, { timeout: 30000 });
  const mission = () => page.evaluate(() => { const s = window.siege.getState(); return { ...s.mission, phase: s.phase, water: Math.round(s.waterLevel), meteors: s.armageddon?.count ?? 0 }; });
  let m = await mission(); const log = [`start t${m.turn} c${m.timedCursor}/${m.timedCount}`];
  // End each turn only while aiming, then let settlement run on its own.
  for (let i = 0; i < 40 && m.phase !== "over" && m.turn <= m.lastTimedTurn + 1; i++) {
    const turn = m.turn;
    let waited = 0;
    while (m.turn === turn && m.phase !== "over" && waited < 60000) {
      if (m.phase === "aim") await page.evaluate(() => window.siege.debug.finishTurn());
      await page.waitForTimeout(500); waited += 500;
      m = await mission();
    }
    if (m.turn === turn && m.phase !== "over") { log.push(`stuck at t${turn} phase ${m.phase}`); break; }
  }
  await page.waitForTimeout(500);
  m = await mission();
  log.push(`end t${m.turn} c${m.timedCursor}/${m.timedCount} seq${m.sequenceCursor}/${m.sequenceCount} code${m.endCode} phase ${m.phase} water ${m.water} meteors ${m.meteors}`);
  test.info().annotations.push({ type: "playthrough", description: log.join(" | ") });
  expect(errors).toEqual([]);
  expect(log.some((line) => line.startsWith("stuck"))).toBe(false);
  // Every timed event either fired or the mission ended first.
  if (m.phase !== "over") expect(m.timedCursor).toBe(m.timedCount);
});
