import { test, expect } from "./helpers/shared-page.js";
import { startMatch } from "./helpers/match.js";
import { nativeAirstrikeImmediate } from "../src/armageddon/airstrike.js";

test("a strike without a plane sprite releases every payload at once", { tag: "@logic" }, () => {
  // 004DF53C..004DF587: centred on the target, spaced by the record, from y = -208 px.
  const payload = [1, 0, 0, 0, 0x10000, 0, 0, 0, 0, 0, 0];
  const { calls } = nativeAirstrikeImmediate({ count: 3, spacing: 10, speed: 0, kind: 2, direction: 0x10000,
    targetX: 600 << 16 }, payload);
  expect(calls.map((c) => c.operation)).toEqual(["missile", "missile", "missile", "delete"]);
  expect(calls.slice(0, 3).map((c) => [c.payload[2] >> 16, c.payload[3] >> 16, c.payload[4]])).toEqual([
    [585, -208, 0], [595, -208, 0], [605, -208, 0]]);
});

test("the donkey drops on its target and blasts its way down", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  const result = await page.evaluate(() => {
    const key = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: " ", code: "Space", bubbles: true }));
    window.siege.debug.advanceReplayFrames(30);
    window.siege.debug.setAmmo(0, "donkey", 9);
    window.siege.debug.setWeapon("donkey");
    key("keydown"); window.siege.debug.advanceReplayFrames(5); key("keyup");
    const s0 = window.siege.getState(), enemy = s0.worms.find((w) => w.team !== s0.team && w.hp > 0);
    const arena = document.querySelector("#arena"), box = arena.getBoundingClientRect(), cam = s0.camera;
    arena.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse", button: 0,
      clientX: box.x + (enemy.x - cam.x) / cam.w * box.width,
      clientY: box.y + (1 - (enemy.y - cam.y) / cam.h) * box.height }));
    window.siege.debug.advanceReplayFrames(2);
    if (window.siege.getState().phase === "aim") { key("keydown"); window.siege.debug.advanceReplayFrames(5); key("keyup"); }
    const blasts = [], xs = new Set();
    let last = null;
    for (let i = 0; i < 1200; i++) {
      window.siege.debug.advanceReplayFrames(1);
      const s = window.siege.getState();
      for (const b of s.bombs) xs.add(Math.round(b.x));
      const e = s.lastExplosion && JSON.stringify(s.lastExplosion);
      if (e && e !== last) { last = e; if (s.lastExplosion.kind === "donkey") blasts.push(Math.round(s.lastExplosion.y)); }
      if (s.team !== s0.team) break;
    }
    return { target: Math.round(enemy.x), xs: [...xs], blasts, ammo: window.siege.getState().ammo[0].donkey };
  });
  expect(errors).toEqual([]);
  expect(result.ammo).toBe(8);
  // No plane: one donkey falls straight down on the target column.
  expect(result.xs).toEqual([result.target]);
  // Each downward contact sends a 0x404 blast and the donkey keeps falling.
  expect(result.blasts.length).toBeGreaterThan(3);
  for (let i = 1; i < result.blasts.length; i++) expect(result.blasts[i]).toBeLessThan(result.blasts[i - 1]);
});
