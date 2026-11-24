import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/rotation.json" with { type: "json" };
import { nativeBodyRotation } from "../src/armageddon/motion.js";
import { startMatch } from "./helpers/match.js";
test("body rotation matches original velocity branches, radius and angle wrap", { tag: "@logic" }, () => {
  for (const row of fixture.cases)
    expect(nativeBodyRotation(row.body)).toEqual(row.result);
});
test("rolling hurt frames advance from native velocity rather than render time", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { startOriginalHurt, stepOriginalHurt, originalWormFrame } =
      await import("/src/armageddon/art.js");
    const w = {
      hp: 100,
      knocked: true,
      facing: 1,
      vx: 200,
      vy: -100,
      x: 100,
      y: 300,
    };
    startOriginalHurt(w, 0x80);
    const a = originalWormFrame(w, "hurt", 0, 45, "rocket", false);
    const b = originalWormFrame(w, "hurt", 100, 45, "rocket", false);
    for (let i = 0; i < 8; i++) stepOriginalHurt(w);
    const c = originalWormFrame(w, "hurt", 100, 45, "rocket", false);
    return {
      name: c.name,
      before: a.index,
      renderOnly: b.index,
      after: c.index,
      angle: w.originalHurt.angle,
    };
  });
  expect(result.name).toBe("wroll");
  expect(result.renderOnly).toBe(result.before);
  expect(result.after).not.toBe(result.before);
  expect(result.angle).toBeGreaterThan(0);
});

test("live blast advances the original rolling frames", async ({ page }) => {
  // A manual clock draws every logic tick, so a slow runner cannot skip the
  // short rolling strip between two rendered frames.
  await startMatch(page, { map: "fern", manualClock: true });
  // Random terrain can immediately select sliding instead of rolling.
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  const result = await page.evaluate(async () => {
    const initial = window.siege.getState();
    const w = initial.worms[0];
    window.siege.debug.explodeAt(w.x - 20, w.y, "death");
    const seen = new Set(), states = new Set();
    let ticks = 0;
    // Observe 1.5 simulation seconds, one rendered frame per tick.
    for (; ticks < 75 && seen.size < 2; ticks++) {
      window.siege.debug.advanceReplayFrames(1);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const worm = window.siege.getState().worms[0];
      states.add(`${worm.nativeHurtState}:${worm.originalSprite}`);
      if (worm.originalSprite === "wroll") seen.add(worm.originalFrame);
    }
    return { frames: [...seen], ticks, states: [...states] };
  });
  expect(result.frames.length, JSON.stringify(result)).toBeGreaterThan(1);
});
