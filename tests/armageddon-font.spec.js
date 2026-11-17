import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import fixture from "./fixtures/armageddon/fonts.json" with { type: "json" };
import { decodeNativeFont, measureNativeText } from "../src/armageddon/font.js";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
test("all original FNT glyphs and advances match the executable", { tag: "@logic" }, () => {
  for (const entry of fixture.cases) {
    const data = readFileSync(`public/armageddon/fonts/${entry.name}.fnt`);
    expect(hash(data)).toBe(entry.sha256);
    const font = decodeNativeFont(data);
    expect(font.height).toBe(entry.height);
    expect(font.space).toBe(entry.space);
    expect([...font.characters]).toEqual(entry.characters);
    expect(
      font.glyphs.map(({ pixels, ...glyph }) => ({
        ...glyph,
        sha256: hash(pixels),
      })),
    ).toEqual(entry.glyphs);
    for (const sample of entry.samples)
      expect(measureNativeText(font, sample.text)).toEqual({
        width: sample.width,
        height: sample.height,
      });
  }
});

test("live team names use original colored glyphs on the pixel grid", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator(".team-lime b")).toHaveAttribute(
    "data-native-font",
    /^(stdgrn1|stdwht1)$/,
  );
  await expect(page.locator(".team-coral b")).toHaveAttribute(
    "data-native-font",
    "stdred1",
  );
  for (const label of await page.locator(".native-team-name").all()) {
    await expect(label).toBeInViewport();
    expect(
      await label.evaluate((canvas) => ({
        height: canvas.height,
        cssHeight: canvas.getBoundingClientRect().height,
        smoothing: getComputedStyle(canvas).imageRendering,
        colored: [
          ...canvas
            .getContext("2d")
            .getImageData(0, 0, canvas.width, canvas.height).data,
        ].some((v, i) => i % 4 !== 3 && v > 0),
      })),
    ).toEqual({
      height: 16,
      cssHeight: 16,
      smoothing: "pixelated",
      colored: true,
    });
  }
  const highlights = await page.evaluate(() => new Promise(resolve => {
    const seen = new Set();
    const sample = () => {
      const team = document.querySelector(".team-lime");
      seen.add(`${team.querySelector("b").dataset.nativeFont}:${team.querySelector(".native-team-health").dataset.nativeColor}`);
      if (seen.size >= 2) resolve([...seen].sort());
      else requestAnimationFrame(sample);
    };
    sample();
  }));
  expect(highlights).toEqual(["stdgrn1:#80ff80", "stdwht1:#ffffff"]);
  await expect(page.locator("#fire")).toBeEnabled();
  await page.screenshot({ path: info.outputPath("native-font-hud.png") });
});
