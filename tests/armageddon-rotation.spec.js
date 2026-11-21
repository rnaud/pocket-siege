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
  await startMatch(page, { map: "fern" });
  // Random terrain can immediately select sliding instead of rolling.
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  const result = await page.evaluate(async () => {
    const initial = window.siege.getState();
    const w = initial.worms[0];
    window.siege.debug.explodeAt(w.x - 20, w.y, "death");
    const seen = new Set(),
      states = new Set(),
      start = performance.now();
    let ticks = 0;
    await new Promise((resolve) => {
      function sample() {
        const state = window.siege.getState();
        const worm = state.worms[0];
        ticks = state.random.frame - initial.random.frame;
        states.add(`${worm.nativeHurtState}:${worm.originalSprite}`);
        if (worm.originalSprite === "wroll") seen.add(worm.originalFrame);
        // CI rendering can be slower than the 50Hz simulation budget. Observe
        // 1.5 simulation seconds, with a wall-clock guard for a stalled game.
        if (seen.size >= 2 || ticks >= 75 || performance.now() - start > 10000)
          resolve();
        else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    return { frames: [...seen], ticks, states: [...states] };
  });
  expect(result.frames.length, JSON.stringify(result)).toBeGreaterThan(1);
});
