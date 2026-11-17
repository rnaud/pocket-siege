import { loadNativeFont, rasterNativeText } from "./font.js";
import { nativeAnnouncementMask } from "./announcements.js";

const fontNames = { 15: "stdwht1", 23: "medwht1", 28: "digiwht" };
const fonts = new Map();
const renderers = new WeakMap();
export async function loadNativeAnnouncementArt() {
  await Promise.all(Object.entries(fontNames).map(async ([id, name]) => fonts.set(Number(id), await loadNativeFont(name))));
}
export function updateNativeAnnouncement(state, target) {
  const entry = state.entries[state.read];
  target.hidden = !state.stage || state.scale <= 0 || !entry;
  if (target.hidden || !fonts.has(entry.font)) return;
  let cache = renderers.get(target);
  if (!cache || cache.entry !== entry) {
    const glyphs = rasterNativeText(fonts.get(entry.font), entry.text);
    // 004C67A0 draws at x=4, adds six pixels to measured width, then
    // includes the final border column/row in the image extent.
    const width = glyphs.width + 7, height = glyphs.height + 1;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const corner = (x === 0 || x === width - 1) && (y === 0 || y === height - 1);
      if (!corner) pixels.set([0, 0, 0, 255], offset);

      if (x >= 4 && x < 4 + glyphs.width && y < glyphs.height) {
        const source = (y * glyphs.width + x - 4) * 4;
        if (glyphs.pixels[source + 3]) pixels.set(glyphs.pixels.subarray(source, source + 4), offset);
      }
    }
    // Border is drawn after glyphs, including four inset corner pixels.
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const outerCorner = (x === 0 || x === width - 1) && (y === 0 || y === height - 1);
      const insetCorner = (x === 1 || x === width - 2) && (y === 1 || y === height - 2);
      if (outerCorner) pixels.fill(0, (y * width + x) * 4, (y * width + x + 1) * 4);
      else if (insetCorner || x === 0 || x === width - 1 || y === 0 || y === height - 1)
        pixels.set([255,255,255,255], (y * width + x) * 4);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    canvas.setAttribute("aria-hidden", "true");
    target.replaceChildren(canvas); target.setAttribute("aria-label", entry.text);
    target.style.top = `${16 - Math.trunc(height / 2)}px`;
    cache = { entry, canvas, pixels, width, height, seed: 0, coverage: -1 };
    renderers.set(target, cache);
  }
  if (cache.coverage === state.scale) return;
  const pixels = cache.pixels.slice();
  const mask = nativeAnnouncementMask(cache.width * cache.height, cache.seed, state.scale);
  for (let i = 0; i < mask.length; i++) if (!mask[i]) pixels.fill(0, i * 4, i * 4 + 4);
  cache.canvas.getContext("2d").putImageData(new ImageData(pixels, cache.width, cache.height), 0, 0);
  if (state.scale < 65536) cache.seed = (Math.imul(cache.seed, 0x19660d) + 0x3c6ef35f) | 0;
  cache.coverage = state.scale;
}
