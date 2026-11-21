import { test, expect } from "./helpers/shared-page.js";
import entry from "./fixtures/armageddon/parachute.json" with { type: "json" };
import { advanceFrames, advanceUntil } from "./helpers/misc-advance.js";
import { startMatch } from "./helpers/match.js";

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
  await startMatch(page, { map: "fern", seed: 42, manualClock: true });
  // Sprites come from the render loop: step one logic frame per drawn frame.
  const sprites = await page.evaluate(async () => {
    window.siege.debug.dropWormForParachute();
    const seen = [];
    for (let frame = 0; frame < 200; frame++) {
      window.siege.debug.advanceReplayFrames(1);
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      const sprite = window.siege.getState().worms[0].originalSprite;
      if (seen.at(-1) !== sprite) seen.push(sprite);
      if (sprite === "wparacht") break;
    }
    return seen;
  });
  expect(sprites).toContain("wparalnk");
  expect(sprites.at(-1)).toBe("wparacht");
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.worms[0].originalCanvas).toEqual({ width: 90, height: 90 });
  expect(state.worms[0].vy).toBeGreaterThanOrEqual(-70);
  expect(state.parachuteArmed).toBe(false);
  // Step the slow descent synchronously instead of watching it in real time.
  await advanceUntil(page, (s) => s.worms[0].y < 500, { label: "canopy descends" });
  await page.screenshot({ path: info.outputPath("original-parachute.png") });
  await advanceUntil(page, (s) => s.worms[0].ground, { max: 3000, label: "canopy lands" });
  // Worm sprites are chosen by the render loop: show one frame of the landing.
  const folded = await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    return window.siege.getState().worms[0].originalSprite;
  });
  expect(folded).toMatch(/^wparbak[ud]?$/);
  // The 13-tick native landing fold then returns to ordinary art.
  await advanceFrames(page, 30);
  expect(
    await page.evaluate(() => window.siege.getState().worms[0].originalSprite),
  ).not.toMatch(/^wparbak[ud]?$/);
  expect(await page.evaluate(() => window.siege.getState().worms[0].hp)).toBe(
    100,
  );
});
