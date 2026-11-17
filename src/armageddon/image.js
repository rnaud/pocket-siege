import { nativeSpritePaletteMap } from "./sprite.js";

// 00492750..00492858 uses the same RGB insertion/byte translation as SPR.
export const nativeImagePaletteMap = nativeSpritePaletteMap;

// Native Team17 IMG: indexed RGB palette, dimensions, optional LZ stream.
// Decode original pixels directly; no raster conversion or resampling.
export function decodeImage(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.length < 16 ||
    view.getUint32(0, true) !== 0x1a474d49 ||
    view.getUint32(4, true) !== bytes.length
  )
    throw new Error("Invalid IMG header");
  if (bytes[8] !== 8 || !(bytes[9] & 128) || bytes[9] & 63)
    throw new Error("Unsupported IMG format");
  const colors = view.getUint16(10, true);
  if (colors > 255) throw new Error("Invalid IMG palette");
  const palette = new Uint8Array((colors + 1) * 4);
  palette[3] = 255;
  for (let i = 0; i < colors; i++) {
    palette.set(bytes.subarray(12 + i * 3, 15 + i * 3), (i + 1) * 4);
    palette[(i + 1) * 4 + 3] = 255;
  }
  let source = 12 + colors * 3;
  const width = view.getUint16(source, true),
    height = view.getUint16(source + 2, true);
  source += 4;
  const size = width * height;
  if (!size || size > 16777216) throw new Error("Invalid IMG dimensions");
  // Some shipped streams encode up to three trailing bytes beyond the image.
  const decoded = new Uint8Array(size + 3);
  let output = 0,
    terminated = false;
  const read = () => {
    if (source >= bytes.length) throw new Error("Truncated IMG stream");
    return bytes[source++];
  };
  if (bytes[9] & 64) {
    while (source < bytes.length) {
      const command = read();
      if (!(command & 128)) {
        if (output >= decoded.length) throw new Error("IMG literal overflow");
        decoded[output++] = command;
        continue;
      }
      const length = (command >> 3) & 15;
      let distance = ((command & 7) << 8) | read();
      if (!length && !distance) {
        terminated = true;
        break;
      }
      const run = length ? length + 2 : read() + 18;
      if (length) distance++;
      if (!distance || distance > output || output + run > decoded.length)
        throw new Error("Invalid IMG back reference");
      for (let i = 0; i < run; i++, output++)
        decoded[output] = decoded[output - distance];
    }
    if (!terminated || output < size) throw new Error("Incomplete IMG pixels");
  } else {
    if (source + size > bytes.length) throw new Error("Truncated IMG pixels");
    decoded.set(bytes.subarray(source, source + size));
  }
  const pixels = decoded.subarray(0, size);
  if (pixels.some((index) => index > colors))
    throw new Error("IMG palette index out of range");
  return { width, height, palette, pixels };
}

export function imageRGBA(image, transparent = true, sharedPalette = null) {
  const rgba = new Uint8ClampedArray(image.width * image.height * 4);
  for (let i = 0; i < image.pixels.length; i++) {
    const source = image.pixels[i];
    const index = sharedPalette ? sharedPalette.mapping[source] : source;
    if (transparent && !index) continue;
    if (sharedPalette) {
      rgba.set(sharedPalette.colors[index], i * 4);
      rgba[i * 4 + 3] = 255;
      continue;
    }
    rgba.set(image.palette.subarray(index * 4, index * 4 + 4), i * 4);
  }
  return rgba;
}
