import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/jetpack.json" with { type: "json" };
import { nativeJetpackTick } from "../src/armageddon/jetpack.js";
test("jetpack poses and easing match 54 original executable ticks", () => {
  for (const row of fixture.cases)
    expect(nativeJetpackTick(row.input)).toEqual(row.output);
});
test("jetpack turns through original poses and renders thrust flames", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="jetpack"]').click();
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].originalSprite),
    )
    .toBe("wjetfly1");
  const result = await page.evaluate(async () => {
    const {
      stepOriginalJetpack,
      stopOriginalJetpack,
      originalWormFrame,
      originalVisual,
    } = await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    let mismatch = 0;
    for (const name of [
      "wjetfly1",
      "wjetfly2",
      "wjetfly3",
      "wjetfly4",
      "wjetflmb",
      "wjetflmd",
    ]) {
      const sprite = decodeSprite(
        await fetch(`/armageddon/sprites/${name}.spr`).then((r) =>
          r.arrayBuffer(),
        ),
      );
      for (let i = 0; i < sprite.frames.length; i++) {
        const pixels = originalVisual(name, i)
          .map.image.getContext("2d")
          .getImageData(0, 0, 60, 60).data;
        const expected = spriteFrameRGBA(sprite, i);
        if (!pixels.every((v, k) => v === expected[k])) mismatch++;
      }
    }
    const worm = { hp: 100, facing: 1 };
    stepOriginalJetpack(worm, 0, 0);
    worm.facing = -1;
    const poses = new Set();
    for (let i = 0; i < 8; i++) {
      stepOriginalJetpack(worm, -1, 1);
      poses.add(originalWormFrame(worm, "fall", 0, 45, "rocket", true).name);
    }
    const flames = [
      worm.originalJetpack.sideFrame,
      worm.originalJetpack.downFrame,
    ];
    stopOriginalJetpack(worm);
    return {
      poses: [...poses],
      flames,
      mismatch,
      cleared: !worm.originalJetpack,
    };
  });
  expect(result.mismatch).toBe(0);
  expect(new Set(result.poses)).toEqual(
    new Set(["wjetfly1", "wjetfly2", "wjetfly3", "wjetfly4"]),
  );
  expect(result.flames.every((v) => v > 0)).toBe(true);
  expect(result.cleared).toBe(true);
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(180);
  await page.screenshot({ path: info.outputPath("original-jetpack.png") });
  await page.keyboard.up("ArrowUp");
  await page.keyboard.press("j");
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].originalSprite),
    )
    .not.toMatch(/^wjetfly/);
});
