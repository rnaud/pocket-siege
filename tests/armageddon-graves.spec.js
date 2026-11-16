import { test, expect } from "@playwright/test";
test("original grave strips preserve dry/wet pixels and switch on submersion", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { originalVisual } = await import("/src/armageddon/art.js");
    const { createOriginalGrave, stepOriginalGrave } =
      await import("/src/armageddon/graves.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    let mismatch = 0,
      frames = 0;
    for (let style = 1; style <= 6; style++)
      for (const wet of [false, true]) {
        const name = `${wet ? "water/" : ""}grave${style}`;
        const url = wet
          ? `/armageddon/media/water/blue/water/grave${style}.spr`
          : `/armageddon/sprites/grave${style}.spr`;
        const source = decodeSprite(
          await fetch(url).then((r) => r.arrayBuffer()),
        );
        for (let i = 0; i < source.frames.length; i++) {
          const actual = originalVisual(name, i)
            .map.image.getContext("2d")
            .getImageData(0, 0, 60, 60).data;
          const expected = spriteFrameRGBA(source, i);
          if (!actual.every((v, k) => v === expected[k])) mismatch++;
          frames++;
        }
      }
    const grave = createOriginalGrave({ team: 0, x: 100, y: 200, facing: 1 });
    const terrain = { solid: () => false };
    const live = stepOriginalGrave(grave, terrain, 0.02, 100);
    const dry = grave.mesh.userData.originalSprite;
    grave.y = 90;
    stepOriginalGrave(grave, terrain, 0.02, 100);
    const wet = grave.mesh.userData.originalSprite;
    grave.y = 0;
    const removed = !stepOriginalGrave(grave, terrain, 0.02, 100);
    return {
      mismatch,
      frames,
      live,
      dry,
      wet,
      removed,
      flip: grave.mesh.scale.x,
      progress: grave.progress,
    };
  });
  expect(result).toEqual({
    mismatch: 0,
    frames: 240,
    live: true,
    dry: "grave1",
    wet: "water/grave1",
    removed: true,
    flip: -1,
    progress: 2 * 0x51e,
  });
});
