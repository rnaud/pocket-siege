import { test, expect } from "@playwright/test";

test("original timer digits preserve every glyph pixel at integer scale", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator("#timer canvas")).toHaveAttribute(
    "data-original-sprite",
    "stdnumw",
  );
  const result = await page.evaluate(async () => {
    const { paintOriginalNumber, originalNumberStrip, updateOriginalTimer } =
      await import("/src/armageddon/number-hud.js");
    const { decodeImage, imageRGBA } = await import("/src/armageddon/image.js");
    const source = decodeImage(
      await fetch("/armageddon/media/gfx/gfx/stdnumw.img").then((r) =>
        r.arrayBuffer(),
      ),
    );
    const rgba = imageRGBA(source);
    const actual = originalNumberStrip()
      .getContext("2d")
      .getImageData(0, 0, 8, 171).data;
    let mismatch = actual.reduce((n, v, i) => n + (v !== rgba[i]), 0);
    const canvas = document.createElement("canvas");
    for (const value of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 45, 60, 100, 120]) {
      paintOriginalNumber(canvas, value);
      const digits = String(value);
      const pixels = canvas
        .getContext("2d")
        .getImageData(0, 0, canvas.width, 11).data;
      for (let y = 0; y < 11; y++)
        for (let x = 0; x < canvas.width; x++)
          for (let c = 0; c < 4; c++) {
            const sy = Number(digits[Math.floor(x / 8)]) * 16 + y;
            if (
              pixels[(y * canvas.width + x) * 4 + c] !==
              rgba[(sy * 8 + (x % 8)) * 4 + c]
            )
              mismatch++;
          }
    }
    const root = document.createElement("div");
    root.innerHTML = '<span id="timer"></span>';
    const labels = [];
    for (const [value, retreat] of [
      [60, false],
      [5, true],
      [0, false],
    ]) {
      updateOriginalTimer(value, retreat, root);
      labels.push([
        root.firstChild.textContent,
        root.firstChild.getAttribute("aria-label"),
      ]);
    }
    return { mismatch, labels };
  });
  expect(result).toEqual({
    mismatch: 0,
    labels: [
      ["60 SEC", "60 SEC"],
      ["5 RETREAT", "5 RETREAT"],
      ["0 SEC", "0 SEC"],
    ],
  });
  const size = await page.locator("#timer canvas").boundingBox();
  expect(size.width).toBe(32);
  expect(size.height).toBe(22);
  const frame = await page.locator(".turn").boundingBox();
  expect(size.y + size.height).toBeLessThanOrEqual(frame.y + frame.height);
  await page.screenshot({ path: info.outputPath("original-timer.png") });
});
