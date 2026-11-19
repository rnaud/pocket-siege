import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/rope-animation.json" with { type: "json" };
import { nativeRopeAnimation } from "../src/armageddon/rope-animation.js";

test("rope animation matches original entry and 552 native directional cases", { tag: "@logic" }, () => {
  expect(fixture.entry).toEqual([
    { operation: "clear" },
    { operation: "queue", sprite_id: 17 },
  ]);
  for (const row of fixture.cases)
    expect(
      nativeRopeAnimation(row.facing, row.angle, row.field104, row.field108),
    ).toEqual(row.output);
});

test("rope poses and attachments preserve every source pixel and clear on release", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { originalVisual, setOriginalRope, originalWormFrame } =
      await import("/src/armageddon/art.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    let mismatches = 0;
    for (const name of ["wbatrope", "ropecuff", "ropetip"]) {
      const sprite = decodeSprite(
        await fetch(`/armageddon/sprites/${name}.spr`).then((r) =>
          r.arrayBuffer(),
        ),
      );
      for (let index = 0; index < sprite.frames.length; index++) {
        const canvas = originalVisual(name, index).map.image;
        const actual = canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data;
        const expected = spriteFrameRGBA(sprite, index);
        if (canvas.width !== sprite.width || canvas.height !== sprite.height)
          mismatches++;
        for (let i = 0; i < expected.length; i++)
          if (actual[i] !== expected[i]) mismatches++;
      }
    }
    const worm = { hp: 100, facing: 1, ground: false };
    const frames = new Set();
    for (let angle = 0; angle < 65536; angle += 1024) {
      setOriginalRope(worm, angle);
      frames.add(originalWormFrame(worm, "fall", 0, 45, "rocket", true).index);
    }
    return { mismatches, frames: frames.size };
  });
  expect(result).toEqual({ mismatches: 0, frames: 64 });
  await page.locator('[data-mode="local"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  for (const angle of [0, -10, 10, -30, 30, -50]) {
    await page.locator("#angle").evaluate((el, value) => {
      el.value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, angle);
    await page.keyboard.press("r");
    await expect.poll(() => page.evaluate(() => window.siege.getState().rope.firing)).toBe(false);
    if (await page.evaluate(() => window.siege.getState().rope.attached)) break;
  }
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].originalSprite),
    )
    .toBe("wbatrope");
  expect(await page.evaluate(() => window.siege.getState().rope.sprite)).toBe(
    "ropecuff",
  );
  await page.screenshot({ path: info.outputPath("original-rope.png") });
  await page.evaluate(() => window.siege.debug.releaseRope());
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].originalSprite),
    )
    .not.toBe("wbatrope");
  expect(
    await page.evaluate(() => window.siege.getState().rope.sprite),
  ).toBeNull();
});
