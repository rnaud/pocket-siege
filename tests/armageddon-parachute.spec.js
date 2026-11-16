import { test, expect } from "@playwright/test";
import entry from "./fixtures/armageddon/parachute.json" with { type: "json" };

test("parachute uses the native entry queue, canopy loop and landing fold", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const {
      startOriginalParachute,
      stepOriginalParachute,
      originalWormFrame,
      startOriginalLanding,
      stepOriginalLanding,
    } = await import("/src/armageddon/art.js");
    const worm = { hp: 100, ground: false, vy: -70, facing: 1 };
    startOriginalParachute(worm);
    const queue = [
      worm.originalParachute.current.id,
      ...worm.originalParachute.slots
        .filter(Boolean)
        .filter((s) => s.id !== worm.originalParachute.current.id)
        .map((s) => s.id),
    ];
    const seen = new Set();
    let min = 100,
      max = -1;
    for (let tick = 0; tick < 110; tick++) {
      const art = originalWormFrame(worm, "fall", tick, 45, "rocket", true);
      seen.add(art.name);
      if (art.map.image.width !== 90 || art.map.image.height !== 90)
        throw new Error("Canopy resampled");
      if (art.name === "wparacht") {
        min = Math.min(min, art.index);
        max = Math.max(max, art.index);
      }
      stepOriginalParachute(worm);
    }
    worm.ground = true;
    startOriginalLanding(worm, 70, 0x7d);
    worm.originalParachute = null;
    const folded = originalWormFrame(
      worm,
      "land",
      111,
      45,
      "rocket",
      true,
    ).name;
    let ticks = 0;
    while (worm.originalLanding && ticks < 50) {
      stepOriginalLanding(worm);
      ticks++;
    }
    startOriginalParachute(worm);
    worm.knocked = true;
    stepOriginalParachute(worm);
    return {
      queue,
      seen: [...seen],
      min,
      max,
      folded,
      ticks,
      canceled: !worm.originalParachute,
    };
  });
  expect(result.queue).toEqual(
    entry.calls.filter((c) => c.operation === "queue").map((c) => c.sprite_id),
  );
  expect(result.seen).toEqual(["wparalnk", "wparacht"]);
  expect(result.min).toBe(0);
  expect(result.max).toBe(16);
  expect(result.folded).toBe("wparbak");
  expect(result.ticks).toBe(13);
  expect(result.canceled).toBe(true);
});

test("live falling worm deploys original canopy, slows continuously and folds on landing", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => {
    window.siege.debug.resetSeed(42);
    window.siege.debug.dropWormForParachute();
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].originalSprite),
    )
    .toBe("wparalnk");
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].originalSprite),
    )
    .toBe("wparacht");
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.worms[0].originalCanvas).toEqual({ width: 90, height: 90 });
  expect(state.worms[0].vy).toBeGreaterThanOrEqual(-70);
  expect(state.parachuteArmed).toBe(false);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().worms[0].y))
    .toBeLessThan(500);
  await page.screenshot({ path: info.outputPath("original-parachute.png") });
  const seen = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const sprites = new Set();
        const deadline = performance.now() + 10000;
        function sample() {
          const w = window.siege.getState().worms[0];
          sprites.add(w.originalSprite);
          if (w.originalSprite === "wparbak" || performance.now() > deadline)
            resolve([...sprites]);
          else requestAnimationFrame(sample);
        }
        sample();
      }),
  );
  expect(seen).toContain("wparbak");
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].originalSprite),
    )
    .not.toBe("wparbak");
  expect(await page.evaluate(() => window.siege.getState().worms[0].hp)).toBe(
    100,
  );
});
