import { test, expect } from "./helpers/shared-page.js";
import { startMatch } from "./helpers/match.js";
import { WEAPONS } from "../src/weapons.js";

// Every arsenal weapon, fired from a fresh turn the way a player would:
// select, hold fire, pick a target when asked, then let the turn run out.
// Each must spend its ammo, raise no page error and resolve into the retreat
// (or the next team's turn).
const INTERNAL = new Set(["bomblet", "shrapnel", "barrel"]);
const kinds = Object.keys(WEAPONS).filter((kind) => !INTERNAL.has(kind));

for (const kind of kinds) {
  test(`${kind} fires and resolves its turn`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await startMatch(page, { map: "fern", seed: 42, manualClock: true });
    const step = (frames) => page.evaluate(async (frames) => {
      window.siege.debug.advanceReplayFrames(frames);
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }, frames);
    // Key events are dispatched in the page so the shared page stays reusable.
    const hold = (frames) => page.evaluate(async (frames) => {
      const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: " ", code: "Space", bubbles: true }));
      key("keydown");
      window.siege.debug.advanceReplayFrames(frames);
      key("keyup");
      window.siege.debug.advanceReplayFrames(2);
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }, frames);
    await step(30);
    const before = await page.evaluate((kind) => {
      window.siege.debug.setAmmo(0, kind, 9);
      window.siege.debug.setWeapon(kind);
      const s = window.siege.getState();
      return { weapon: s.weapon, team: s.team };
    }, kind);
    expect(before.weapon).toBe(kind);
    await hold(25);
    if (await page.evaluate(() => window.siege.getState().targetUtility)) {
      // Targeted weapons: click the first enemy worm, then fire if still aiming.
      await page.evaluate(() => {
        const s = window.siege.getState(), enemy = s.worms.find((w) => w.team !== s.team && w.hp > 0);
        const arena = document.querySelector("#arena"), box = arena.getBoundingClientRect(), cam = s.camera;
        arena.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0,
          clientX: box.x + (enemy.x - cam.x) / cam.w * box.width,
          clientY: box.y + (1 - (enemy.y - cam.y) / cam.h) * box.height }));
      });
      await step(2);
      const s = await page.evaluate(() => { const s = window.siege.getState(); return { phase: s.phase, target: s.targetUtility }; });
      if (!s.target && s.phase === "aim") await hold(25);
    }
    const ended = await page.evaluate((team) => {
      for (let frame = 0; frame < 4000; frame += 5) {
        const s = window.siege.getState();
        if (s.team !== team || s.phase === "over" || (s.retreat > 0 && !s.projectile && !s.bombs.length)) return true;
        window.siege.debug.advanceReplayFrames(5);
      }
      return false;
    }, before.team);
    const ammo = await page.evaluate((kind) => window.siege.getState().ammo[0][kind], kind);
    expect(errors).toEqual([]);
    expect(ammo).toBe(8);
    expect(ended).toBe(true);
  });
}
