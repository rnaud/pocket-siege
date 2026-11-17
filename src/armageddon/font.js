import { nativeSpritePaletteMap } from "./sprite.js";

// 004B04B0 also allocates opaque black for source index0.
export function nativeFontPaletteMap(font, palette) {
  const black = palette.add([0, 0, 0]);
  const mapping = nativeSpritePaletteMap(font, palette);
  mapping[0] = black;
  return mapping;
}

// Original FNT layout: 004B04B0; advances: 004B0A80; glyph copy: 004B08D0.
export function decodeNativeFont(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x1a544e46)
    throw new Error("Invalid native FNT signature");
  const length = view.getUint32(4, true);
  const colors = view.getUint16(10, true);
  if (length > bytes.length || colors > 255)
    throw new Error("Invalid FNT size");
  const palette = new Uint8ClampedArray((colors + 1) * 4);
  palette[3] = 255;
  for (let i = 1; i <= colors; i++) {
    palette.set(bytes.subarray(12 + (i - 1) * 3, 15 + (i - 1) * 3), i * 4);
    palette[i * 4 + 3] = 255;
  }
  let offset = 12 + colors * 3;
  const characters = bytes.slice(offset, offset + 256);
  offset += 256;
  const height = view.getInt16(offset, true);
  const count = view.getInt16(offset + 2, true);
  offset = (offset + 7) & ~3;
  const pixelsAt = offset + count * 12;
  const glyphs = Array.from({ length: count }, (_, i) => {
    const at = offset + i * 12;
    const width = view.getUint16(at + 4, true);
    const height = view.getUint16(at + 6, true);
    const start = pixelsAt + view.getUint32(at + 8, true);
    if (start + width * height > length) throw new Error("Truncated FNT glyph");
    return {
      y: view.getUint16(at + 2, true),
      width,
      height,
      pixels: bytes.slice(start, start + width * height),
    };
  });
  return {
    height,
    space: Math.trunc(height / 5) + 1,
    characters,
    glyphs,
    palette,
  };
}

export function measureNativeText(font, text) {
  let width = 0;
  for (const character of text) {
    if (character === "\0") break;
    const code = character.charCodeAt(0);
    const id = code < 256 ? font.characters[code] : 0;
    width += id ? font.glyphs[id - 1].width + 1 : font.space;
  }
  return { width, height: font.height };
}

export function rasterNativeText(font, text) {
  const { width, height } = measureNativeText(font, text);
  const pixels = new Uint8ClampedArray(width * height * 4);
  let x = 0;
  for (const character of text) {
    if (character === "\0") break;
    const code = character.charCodeAt(0);
    const id = code < 256 ? font.characters[code] : 0;
    if (!id) {
      x += font.space;
      continue;
    }
    const glyph = font.glyphs[id - 1];
    for (let row = 0; row < glyph.height && row + glyph.y < height; row++)
      for (let col = 0; col < glyph.width; col++) {
        const color = glyph.pixels[row * glyph.width + col];
        // The final HUD image blit treats palette index zero as transparent.
        if (!color) continue;
        pixels.set(
          font.palette.subarray(color * 4, color * 4 + 4),
          ((row + glyph.y) * width + x + col) * 4,
        );
      }
    x += glyph.width + 1;
  }
  return { width, height, pixels };
}

const pending = new Map();
export function loadNativeFont(name) {
  if (!/^[a-z0-9]+$/.test(name)) throw new Error("Invalid font name");
  if (!pending.has(name))
    pending.set(
      name,
      fetch(`${import.meta.env.BASE_URL}armageddon/fonts/${name}.fnt`)
        .then((response) => {
          if (!response.ok) throw new Error(`Font ${name}: ${response.status}`);
          return response.arrayBuffer();
        })
        .then(decodeNativeFont)
        .catch((error) => {
          pending.delete(name);
          throw error;
        }),
    );
  return pending.get(name);
}

export function paintNativeText(canvas, font, text, scale = 2) {
  const image = rasterNativeText(font, text);
  canvas.width = Math.max(1, image.width);
  canvas.height = image.height;
  if (image.width)
    canvas
      .getContext("2d")
      .putImageData(
        new ImageData(image.pixels, image.width, image.height),
        0,
        0,
      );
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
}
