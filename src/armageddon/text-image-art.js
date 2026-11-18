import { nativeRenderTextImage } from './text-image.js';
import { nativeAnnouncementMask } from './announcements.js';
import { rasterNativeText } from './font.js';

// Browser RGBA backend for the native indexed-image interfaces. Source buffers
// stay untinted; callers apply the display palette after copying to a canvas.
export function createNativeTextRenderer(width, height, font, color, seed = 0) {
  const make = (width, height) => ({ width, height, pixels: new Uint8ClampedArray(width * height * 4) });
  const put = (image, x, y, rgba) => {
    if (x >= 0 && y >= 0 && x < image.width && y < image.height)
      image.pixels.set(rgba, (y * image.width + x) * 4);
  };
  const pixel = (image, x, y, index) => put(image, x, y, index ? [...color(index), 255] : [0, 0, 0, 0]);
  const state = { width, height, baseImage: make(width, height), fadedImage: null,
    seed, font: 0, background: 0, border: 0, coverage: -1, text: '',
    cachedWidth: 0, cachedHeight: 0, image: null };
  const host = {
    clear: image => image.pixels.fill(0),
    fill: (image, x, y, w, h, index) => {
      for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) pixel(image, col, row, index);
    },
    text: (id, image, x, y, text) => {
      const glyphs = rasterNativeText(font(id), text);
      for (let row = 0; row < glyphs.height; row++) for (let col = 0; col < glyphs.width; col++) {
        const offset = (row * glyphs.width + col) * 4;
        if (glyphs.pixels[offset + 3]) put(image, x + col, y + row, glyphs.pixels.subarray(offset, offset + 4));
      }
      return glyphs;
    },
    horizontal: (image, first, last, y, index) => { for (let x = first; x <= last; x++) pixel(image, x, y, index); },
    vertical: (image, x, first, last, index) => { for (let y = first; y <= last; y++) pixel(image, x, y, index); },
    pixel,
    allocate: () => ({}),
    initialize: (image, w, h) => Object.assign(image, make(w, h)),
    copy: (image, x, y, w, h, source, sx, sy) => {
      for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
        const offset = ((sy + row) * source.width + sx + col) * 4;
        put(image, x + col, y + row, source.pixels.subarray(offset, offset + 4));
      }
    },
    mask: (image, w, h, _zero, seed, coverage) => {
      const mask = nativeAnnouncementMask(w * h, seed, coverage);
      for (let i = 0; i < mask.length; i++) if (!mask[i])
        put(image, i % w, Math.floor(i / w), [0, 0, 0, 0]);
    },
  };
  return { state, render: request => nativeRenderTextImage(state, request, host) };
}

export function paintNativeTextImage(canvas, result) {
  const { image, width, height } = result;
  canvas.width = width; canvas.height = height;
  if (!width || !height) return;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    pixels.set(image.pixels.subarray(y * image.width * 4, (y * image.width + width) * 4), y * width * 4);
  canvas.getContext('2d').putImageData(new ImageData(pixels, width, height), 0, 0);
}
