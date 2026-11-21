import { test, expect } from "@playwright/test";
import { startMatch } from "./helpers/match.js";
test("original aiming crosshairs retain all palette frames and mirrored pixels", async ({
  page,
}, info) => {
  await startMatch(page);
  await expect(page.locator(".original-crosshair")).toHaveAttribute(
    "data-original-sprite",
    "crshairg",
  );
  const result = await page.evaluate(async () => {
    const { originalVisual } = await import("/src/armageddon/art.js");
    const { originalCrosshairFrame, updateOriginalCrosshair } =
      await import("/src/armageddon/crosshair-hud.js");
    const { decodeSprite, spriteFrameRGBA } =
      await import("/src/armageddon/sprite.js");
    let mismatch = 0,
      frames = 0;
    const names = ["r", "b", "g", "y", "p", "c"].map((color) => `crshair${color}`);
    const buffers = await Promise.all(names.map((name) =>
      fetch(`/armageddon/sprites/${name}.spr`).then((r) => r.arrayBuffer())));
    for (const [n, name] of names.entries()) {
      const source = decodeSprite(buffers[n]);
      for (let i = 0; i < source.frames.length; i++) {
        const actual = originalVisual(name, i)
          .map.image.getContext("2d")
          .getImageData(0, 0, 60, 60).data;
        const expected = spriteFrameRGBA(source, i);
        if (!actual.every((v, k) => v === expected[k])) mismatch++;
        frames++;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 60;
    for (const team of [0, 1])
      for (const angle of [0, 45, 90, 135, 180, 225, 270, 315]) {
        updateOriginalCrosshair(canvas, team, angle);
        const actual = canvas.getContext("2d").getImageData(0, 0, 60, 60).data;
        const source = originalVisual(
          canvas.dataset.originalSprite,
          +canvas.dataset.frame,
        )
          .map.image.getContext("2d")
          .getImageData(0, 0, 60, 60).data;
        const flip = Math.cos((angle * Math.PI) / 180) >= 0;
        for (let y = 0; y < 60; y++)
          for (let x = 0; x < 60; x++)
            for (let c = 0; c < 4; c++)
              if (
                actual[(y * 60 + x) * 4 + c] !==
                source[(y * 60 + (flip ? 59 - x : x)) * 4 + c]
              )
                mismatch++;
      }
    return {
      mismatch,
      frames,
      phases: [0, 0x4000, 0x8000, 0xc000, 0xffff].map(
        (aim) => originalCrosshairFrame(2, aim).index,
      ),
    };
  });
  expect(result).toEqual({
    mismatch: 0,
    frames: 192,
    phases: [0, 8, 16, 24, 0],
  });
  await expect(page.locator("#aim-reticle > path").first()).toBeHidden();
  const box = await page.locator(".original-crosshair").boundingBox();
  expect(box.width).toBe(60);
  expect(box.height).toBe(60);
  await page.screenshot({ path: info.outputPath("original-crosshair.png") });
});
