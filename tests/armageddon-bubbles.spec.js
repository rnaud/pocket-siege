import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/bubbles.json" with { type: "json" };
import { nativeBubble, nativeBubbleTick } from "../src/armageddon/bubble.js";
import { advanceUntil } from "./helpers/misc-advance.js";

test("bubble physics and surface retirement match 192 original executable cases", { tag: "@logic" }, () => {
  for (const row of fixture.cases)
    expect(nativeBubbleTick(row.input, row.seed, row.waterY)).toEqual(
      row.output,
    );
  for (let size = 1; size <= 4; size++) {
    const bubble = nativeBubble(0, 0, 0, 0, size);
    expect(bubble.sprite).toBe(size + 0x33f);
    expect(bubble.buoyancy).toBe(size * 0x9999 + 0x6667);
  }
});

for (const frozen of [false, true])
  test(`live ${frozen ? "frozen" : "normal"} drowning uses original sprite and rising bubbles`, async ({
    page,
  }, info) => {
    await page.goto("/");
    await page.locator('[data-mode="local"]').click();
    await page.locator("#start").click();
    const before = await page.evaluate(() => window.siege.getState().worms[0]);
    await page.evaluate(
      (frozen) => window.siege.debug.submergeWorm(0, frozen),
      frozen,
    );
    await expect
      .poll(() =>
        page.evaluate(() => window.siege.getState().worms[0].originalSprite),
      )
      .toBe(frozen ? "water/wfdrown" : "water/wdrown");
    await advanceUntil(page, (s) => s.waterBubbles.length > 0, { label: "first bubble" });
    const state = await page.evaluate(() => window.siege.getState());
    expect(state.worms[0].hp).toBe(0);
    expect(state.worms[0].damageTaken).toBe(before.damageTaken + before.hp);
    expect(state.nativeCameraFocus).not.toBeNull();
    expect(
      state.waterBubbles.every((b) => /^water\/bubble[1-4]$/.test(b.sprite)),
    ).toBe(true);
    expect(state.waterBubbles.every((b) => b.y < state.waterLevel)).toBe(true);
    await page.screenshot({ path: info.outputPath("original-drowning.png") });
    // Step the rest of the drowning synchronously until every bubble surfaces.
    await advanceUntil(page, (s) => s.waterBubbles.length === 0, { label: "bubbles retire" });
    await page.evaluate(() => window.siege.debug.resetSeed(42));
    expect(
      await page.evaluate(() => window.siege.getState().waterBubbles.length),
    ).toBe(0);
  });

test("drowning animation advances only on logic ticks and emits every fourth tick", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { startOriginalDrowning, stepOriginalDrowning, originalWormFrame } =
      await import("/src/armageddon/art.js");
    const worm = { drowned: true, frozen: false };
    startOriginalDrowning(worm);
    const emissions = [],
      frames = [];
    for (let tick = 1; tick <= 40; tick++) {
      if (stepOriginalDrowning(worm)) emissions.push(tick);
      const a = originalWormFrame(worm),
        b = originalWormFrame(worm);
      frames.push(a.index);
      if (a.index !== b.index)
        throw new Error("Rendering advanced the animation");
    }
    return { emissions, frames };
  });
  expect(result.emissions).toEqual([4, 8, 12, 16, 20, 24, 28, 32, 36, 40]);
  expect(Math.max(...result.frames)).toBe(9);
  expect(result.frames[39]).toBeLessThan(result.frames[19]);
});
