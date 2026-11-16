import { test, expect } from "@playwright/test";
test("target markers preserve all team frames and native ping-pong cadence", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { originalVisual } = await import("/src/armageddon/art.js");
    const { originalTargetFrame, updateOriginalTarget } =
      await import("/src/armageddon/target-hud.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    let mismatch = 0,
      frames = 0;
    for (const color of ["r", "b", "g", "y", "p", "c"]) {
      const name = `marker${color}`;
      const source = decodeSprite(
        await fetch(`/armageddon/sprites/${name}.spr`).then((r) =>
          r.arrayBuffer(),
        ),
      );
      for (let i = 0; i < 10; i++) {
        const actual = originalVisual(name, i)
          .map.image.getContext("2d")
          .getImageData(0, 0, 60, 60).data;
        const expected = spriteFrameRGBA(source, i);
        if (!actual.every((v, k) => v === expected[k])) mismatch++;
        frames++;
      }
    }
    const canvas = document.createElement("canvas");
    updateOriginalTarget(canvas, 0, 10);
    const green = canvas.dataset.originalSprite;
    updateOriginalTarget(canvas, 1, 10);
    return {
      mismatch,
      frames,
      green,
      red: canvas.dataset.originalSprite,
      phases: [0, 1, 5, 10, 15, 20, 21].map(
        (t) => originalTargetFrame(2, t).index,
      ),
    };
  });
  expect(result).toEqual({
    mismatch: 0,
    frames: 60,
    green: "markerg",
    red: "markerr",
    phases: [0, 0, 4, 9, 5, 1, 0],
  });
});
