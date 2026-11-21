import { test, expect } from "./helpers/shared-page.js";
import { startMatch } from "./helpers/match.js";
test("original wind strips retain source pixels and clip left/right strength without scaling", async ({
  page,
}, info) => {
  await startMatch(page);
  const result = await page.evaluate(async () => {
    const { updateOriginalWindHUD, originalWindStrip } =
      await import("/src/armageddon/wind-hud.js");
    const { decodeImage, imageRGBA } = await import("/src/armageddon/image.js");
    let mismatch = 0;
    const names = ["windl", "windr"];
    const buffers = await Promise.all(names.map((name) =>
      fetch(`/armageddon/media/gfx/gfx/${name}.img`).then((r) => r.arrayBuffer())));
    for (const [n, name] of names.entries()) {
      const image = decodeImage(buffers[n]);
      const canvas = originalWindStrip(name),
        pixels = canvas.getContext("2d").getImageData(0, 0, 96, 13).data;
      const expected = imageRGBA(image);
      if (!pixels.every((v, i) => v === expected[i])) mismatch++;
    }
    const root = document.createElement("div");
    root.innerHTML = '<div id="wind"></div>';
    const cases = [];
    // Native181x17 geometry, including asymmetric end caps and center gap.
    for (const [level, start, width, edge] of [
      [-10, 14, 75, 14], [-5, 52, 37, 52], [0, 0, 0, 0],
      [5, 92, 36, 127], [10, 92, 74, 165], [20, 92, 87, 178],
    ]) {
      for (let phase = 0; phase < 65536; phase += 8192) {
        const wind = Math.trunc(level * 65536 / 35) / 65536 * 2500;
        updateOriginalWindHUD(wind, root, phase);
        const canvas = root.querySelector("canvas");
        const actual = canvas.getContext("2d").getImageData(0, 0, 181, 17).data;
        const source = originalWindStrip(wind < 0 ? "windl" : "windr")
          .getContext("2d").getImageData(0, 0, 96, 13).data;
        const offset = level < 0 ? phase / 8192 : (phase / 8192) ^ 7;
        for (let y = 0; y < 17; y++) for (let x = 0; x < 181; x++) {
          let expected = x === 90 ? [255,255,255,255] :
            x >= 2 && x < 179 && y >= 2 && y < 15 ? [0,0,0,255] : [0,0,0,0];
          if (width && x >= start && x < start + width && y >= 2 && y < 15) {
            const i = ((y - 2) * 96 + offset + x - start) * 4;
            expected = [...source.slice(i, i + 4)];
            if (!expected[3]) expected = [0,0,0,255];
          }
          if (width && x === edge && (y === 2 || y === (level < 0 ? 15 : 14)))
            expected = [0,0,0,255];
          for (let c = 0; c < 4; c++)
            if (actual[(y * 181 + x) * 4 + c] !== expected[c]) mismatch++;
        }
      }
      cases.push(+root.querySelector("canvas").dataset.filledPixels);
    }
    updateOriginalWindHUD(-5 / 35 * 2500, root);
    return { mismatch, cases, label: root.querySelector("#wind").getAttribute("aria-label") };
  });
  expect(result).toEqual({ mismatch: 0, cases: [75, 37, 0, 36, 74, 87], label: "WIND ← 5.0" });
  const size = await page.locator("#wind canvas").boundingBox();
  expect(size.width).toBe(181);
  expect(size.height).toBe(17);
  await page.screenshot({ path: info.outputPath("original-wind-meter.png") });
});
