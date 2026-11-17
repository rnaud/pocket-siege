import { test, expect } from "@playwright/test";
test("original wind strips retain source pixels and clip left/right strength without scaling", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  const result = await page.evaluate(async () => {
    const { updateOriginalWindHUD, originalWindStrip } =
      await import("/src/armageddon/wind-hud.js");
    const { decodeImage, imageRGBA } = await import("/src/armageddon/image.js");
    let mismatch = 0;
    for (const name of ["windl", "windr"]) {
      const image = decodeImage(
        await fetch(`/armageddon/media/gfx/gfx/${name}.img`).then((r) =>
          r.arrayBuffer(),
        ),
      );
      const canvas = originalWindStrip(name),
        pixels = canvas.getContext("2d").getImageData(0, 0, 96, 13).data;
      const expected = imageRGBA(image);
      if (!pixels.every((v, i) => v === expected[i])) mismatch++;
    }
    const cases = [];
    for (const level of [-10, -5, 0, 5, 10, 20]) {
      const wind = level / 35 * 2500;
      updateOriginalWindHUD(wind);
      const canvas = document.querySelector("#wind canvas");
      const actual = canvas.getContext("2d").getImageData(0, 0, 193, 13).data;
      const source = originalWindStrip(wind < 0 ? "windl" : "windr")
        .getContext("2d")
        .getImageData(0, 0, 96, 13).data;
      const width = wind === 0 ? 0 : Math.abs(level) === 5 ? 48 : 96;
      for (let y = 0; y < 13; y++)
        for (let x = 0; x < 193; x++) {
          const filled =
            wind < 0 ? x >= 96 - width && x < 96 : x >= 97 && x < 97 + width;
          for (let c = 0; c < 4; c++) {
            const expected = filled
              ? source[(y * 96 + (wind < 0 ? x : x - 97)) * 4 + c]
              : 0;
            if (actual[(y * 193 + x) * 4 + c] !== expected) mismatch++;
          }
        }
      cases.push(+canvas.dataset.filledPixels);
    }
    updateOriginalWindHUD(-5 / 35 * 2500);
    return { mismatch, cases };
  });
  expect(result).toEqual({ mismatch: 0, cases: [96, 48, 0, 48, 96, 96] });
  await expect(page.locator("#wind")).toHaveAttribute(
    "aria-label",
    "WIND ← 5.0",
  );
  const size = await page.locator("#wind canvas").boundingBox();
  expect(size.width).toBe(193);
  expect(size.height).toBe(13);
  await page.screenshot({ path: info.outputPath("original-wind-meter.png") });
});
