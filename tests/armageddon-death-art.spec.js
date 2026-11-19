import { test, expect } from "@playwright/test";
test("death strip completes on simulation ticks without render-driven advancement", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const {
      startOriginalDeath,
      stepOriginalDeath,
      originalWormFrame,
      originalVisual,
    } = await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    const source = decodeSprite(
      await fetch("/armageddon/sprites/wdie.spr").then((r) => r.arrayBuffer()),
    );
    let mismatch = 0;
    for (let i = 0; i < 60; i++) {
      const actual = originalVisual("wdie", i)
        .map.image.getContext("2d")
        .getImageData(0, 0, 60, 60).data;
      const expected = spriteFrameRGBA(source, i);
      if (!actual.every((v, k) => v === expected[k])) mismatch++;
    }
    const worm = { hp: 0, deathPending: true, ground: true };
    startOriginalDeath(worm);
    const frame = (time) =>
      originalWormFrame(worm, "hurt", time, 45, "rocket", false).index;
    const initial = [frame(0), frame(10000)];
    let ticks = 0,
      complete = false,
      max = 0;
    while (!complete && ticks < 100) {
      complete = stepOriginalDeath(worm);
      ticks++;
      max = Math.max(max, frame(10000));
    }
    return { mismatch, initial, ticks, complete, max };
  });
  expect(result).toEqual({
    mismatch: 0,
    initial: [0, 0],
    ticks: 86,
    complete: true,
    max: 59,
  });
});
test("live death plays past the old cutoff before its explosion", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.siege
          .getState()
          .worms.slice(3)
          .every((w) => w.ground),
      ),
    )
    .toBe(true);
  await page.evaluate(() => {
    // Late frames last less than a second. Keep the maximum on every render
    // instead of hoping Playwright's backoff poll lands inside that window.
    window.deathFrameProbe = {
      max: 0,
      smoke: 0,
      debris: 0,
      rings: false,
      active: true,
      deaths: [],
      maxConcurrent: 0,
      damageVisibleAtFirstDeath: null,
      pendingLabelVisible: false,
      advancedFrames: 0,
    };
    const sample = () => {
      const probe = window.deathFrameProbe;
      if (!probe.active) return;
      probe.smoke = Math.max(
        probe.smoke,
        window.siege.getState().originalSmoke.length,
      );
      probe.debris = Math.max(
        probe.debris,
        window.siege.getState().originalDebris.length,
      );
      probe.rings ||= window.siege
        .getState()
        .nativeParticles.some((p) => p.sprite === "circle25");
      const pending = window.siege.getState().worms;
      for (let i = 3; i < pending.length; i++)
        if (pending[i].hp === 0 && pending[i].deathPending && pending[i].originalSprite !== 'wdie')
          probe.pendingLabelVisible ||= getComputedStyle(document.querySelectorAll('.worm-label')[i]).visibility === 'visible';
      const dying = window.siege.getState().worms.slice(3)
        .filter(w => w.deathPending && w.originalSprite === "wdie");
      probe.maxConcurrent = Math.max(probe.maxConcurrent, dying.length);
      for (const worm of dying) {
        if (probe.damageVisibleAtFirstDeath === null)
          probe.damageVisibleAtFirstDeath = [...document.querySelectorAll('.native-damage-number')]
            .some(canvas => !canvas.hidden);
        if (!probe.deaths.includes(worm.x)) probe.deaths.push(worm.x);
        probe.max = Math.max(probe.max, worm.originalFrame);
      }
      // Keep a rendered sample between small simulation batches. Software
      // rendering on CI must not dictate how long three death strips take.
      // Five ticks cannot skip the late portion of the 86-tick death strip.
      if (probe.advancedFrames < 3000 && window.siege.getState().phase !== "over") {
        window.siege.debug.advanceReplayFrames(5);
        probe.advancedFrames += 5;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    window.siege.debug.hit(1, 200);
  });
  await expect
    .poll(() => page.evaluate(() => window.deathFrameProbe.max), { timeout: 15000 })
    .toBeGreaterThan(40);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.siege
          .getState()
          .worms.slice(3)
          .every((w) => !w.deathPending),
      ),
      { timeout: 15000 }, // Three sequential native death strips plus damage reveals.
    )
    .toBe(true);
  await expect(page.locator(".team-coral")).toBeHidden({ timeout: 5000 });
  // Native death, elimination and kill announcements drain before match end.
  // CI captured the completed match just after the former five-second poll.
  await expect.poll(() => page.evaluate(() => window.siege.getState().phase),
    { timeout: 10000, intervals: [100] }).toBe("over");
  const sequence = await page.evaluate(() => window.deathFrameProbe);
  expect(sequence.maxConcurrent).toBe(1);
  expect(sequence.pendingLabelVisible).toBe(true);
  expect(sequence.damageVisibleAtFirstDeath).toBe(false);
  expect(sequence.deaths).toHaveLength(3);
  expect(sequence.deaths).toEqual([...sequence.deaths].sort((a, b) => a - b));
  expect(
    await page.evaluate(() => window.siege.getState().explosions),
  ).toBeGreaterThanOrEqual(3);
  expect(await page.evaluate(() => window.siege.getState().graves.length)).toBe(
    3,
  );
  expect(
    await page.evaluate(() => window.deathFrameProbe.smoke),
  ).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.deathFrameProbe.rings)).toBe(true);
  expect(
    await page.evaluate(() => window.deathFrameProbe.debris),
  ).toBeGreaterThan(0);
  await page.evaluate(() => {
    window.deathFrameProbe.active = false;
  });
  await page.screenshot({
    path: test.info().outputPath("original-graves.png"),
  });
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  expect(await page.evaluate(() => window.siege.getState().graves)).toEqual([]);
  expect(
    await page.evaluate(() => window.siege.getState().originalSmoke),
  ).toEqual([]);
});
