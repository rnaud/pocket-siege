import { test, expect } from "@playwright/test";

test("original timer digits preserve every glyph pixel at integer scale", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator("#timer canvas")).toHaveAttribute(
    "data-native-font",
    "lnumwht1",
  );
  const result = await page.evaluate(async () => {
    const { paintOriginalNumber, updateOriginalTimer } = await import("/src/armageddon/number-hud.js");
    const { loadNativeFont, rasterNativeText } = await import("/src/armageddon/font.js");
    let mismatch = 0;
    const canvas = document.createElement("canvas");
    for (const [index, name] of ["lnumred1", "lnumwht1", "lnumred2", "lnumwht2"].entries()) {
      const font = await loadNativeFont(name);
      for (const value of [0,1,2,3,4,5,6,7,8,9,10,45,60,100,120]) {
        paintOriginalNumber(canvas, value, index + 24);
        const expected = rasterNativeText(font, String(value));
        const actual = canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;
        mismatch += actual.reduce((n,v,i) => n + (v !== expected.pixels[i]), 0);
        if (canvas.width !== expected.width || canvas.height !== expected.height) mismatch++;
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
  await expect(page.locator(".turn")).toHaveCSS("bottom", "9px");
  const size = await page.locator("#timer canvas").boundingBox();
  expect(size.width).toBe(33);
  expect(size.height).toBe(32);
  const frame = await page.locator(".turn").boundingBox();
  expect(size.y + size.height).toBeLessThanOrEqual(frame.y + frame.height);
  expect({width: frame.width, height: frame.height}).toEqual({width: 56, height: 42});
  const arena = await page.locator("#arena").boundingBox();
  expect(frame.x - arena.x).toBe(10);
  expect(arena.y + arena.height - frame.y - frame.height).toBe(9);
  await page.screenshot({ path: info.outputPath("original-timer.png") });
});
