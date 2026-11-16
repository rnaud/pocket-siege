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
  await page.locator("#mode").selectOption("local");
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
  await page.evaluate(() => window.siege.debug.hit(1, 200));
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.max(
          ...window.siege
            .getState()
            .worms.slice(3)
            .filter((w) => w.deathPending && w.originalSprite === "wdie")
            .map((w) => w.originalFrame),
          0,
        ),
      ),
    )
    .toBeGreaterThan(40);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.siege
          .getState()
          .worms.slice(3)
          .every((w) => !w.deathPending),
      ),
    )
    .toBe(true);
  expect(
    await page.evaluate(() => window.siege.getState().explosions),
  ).toBeGreaterThanOrEqual(3);
});
