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
  const textImages = await page.evaluate(async () => {
    const { createNativeTextRenderer, paintNativeTextImage } = await import('/src/armageddon/text-image-art.js');
    const { loadNativeFont, rasterNativeText } = await import('/src/armageddon/font.js');
    const { updateNativeAnnouncement } = await import('/src/armageddon/announcement-art.js');
    const font = await loadNativeFont('stdwht1');
    const colors = { 7: [157,157,157], 8: [0,0,0] };
    const renderer = createNativeTextRenderer(256, font.height + 1, () => font, id => colors[id]);
    const plain = renderer.render({ text: 'ABC', font: 15, background: 0, border: 0, coverage: 65536 });
    const glyphs = rasterNativeText(font, 'ABC');
    let glyphMismatch = 0;
    for (let y = 0; y < glyphs.height; y++) for (let x = 0; x < glyphs.width; x++)
      for (let c = 0; c < 4; c++) if (plain.image.pixels[(y * 256 + x) * 4 + c] !== glyphs.pixels[(y * glyphs.width + x) * 4 + c]) glyphMismatch++;
    const request = { text: 'ABC', font: 15, background: 8, border: 7, coverage: 32768 };
    const faded = renderer.render(request), seed = renderer.state.seed;
    const opaque = image => image.pixels.reduce((n, v, i) => n + (i % 4 === 3 && v > 0 ? 1 : 0), 0);
    const partialFade = opaque(faded.image) > 0 && opaque(faded.image) < opaque(renderer.state.baseImage);
    const cached = renderer.render(request);
    const unchanged = seed === renderer.state.seed && faded.image === cached.image;
    const changed = renderer.render({ ...request, text: 'DEF' });
    const changedUsesBase = changed.image === renderer.state.baseImage;
    const clipped = createNativeTextRenderer(8, 4, () => font, id => colors[id]).render({ ...request, coverage: 65536 });
    const canvas = document.createElement('canvas'); paintNativeTextImage(canvas, clipped);
    const border = [...canvas.getContext('2d').getImageData(1, 0, 1, 1).data];
    const corner = [...canvas.getContext('2d').getImageData(0, 0, 1, 1).data];
    const parent = document.createElement('div'); parent.style.cssText = 'width:640px;height:480px';
    const target = document.createElement('div'); parent.append(target); document.body.append(parent);
    updateNativeAnnouncement({ read: 0, stage: 1, scale: 65536, entries: [{ text: 'ABC', font: 15 }] }, target);
    const liveBorder = [...target.querySelector('canvas').getContext('2d').getImageData(1, 0, 1, 1).data];
    parent.remove();
    return { glyphMismatch, unchanged, changedUsesBase, partialFade, clipped: [canvas.width, canvas.height], border, corner, liveBorder };
  });
  expect(textImages).toEqual({ glyphMismatch: 0, unchanged: true, changedUsesBase: true, partialFade: true,
    clipped: [8, 4], border: [157,157,157,255], corner: [0,0,0,0], liveBorder: [157,157,157,255] });
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
