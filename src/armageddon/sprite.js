// Original SPR container: indexed palette, independently compressed blocks,
// frame rectangles and packed block/offset addresses. No image resampling.
export function decodeSprite(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (p) => view.getUint16(p, true);
  const u32 = (p) => view.getUint32(p, true);
  if (
    u32(0) !== 0x1a525053 ||
    u32(4) !== bytes.length ||
    bytes[8] !== 8 ||
    bytes[9] !== 192
  )
    throw new Error("Unsupported SPR header");
  const colors = u16(10);
  const palette = new Uint8Array((colors + 1) * 4);
  for (let i = 0; i < colors; i++) {
    palette.set(bytes.subarray(12 + i * 3, 15 + i * 3), (i + 1) * 4);
    palette[(i + 1) * 4 + 3] = 255;
  }
  let p = 12 + colors * 3;
  const blockCount = u16(p);
  p = (p + 2 + 3) & ~3;
  const descriptors = [];
  for (let i = 0; i < blockCount; i++, p += 12)
    descriptors.push({ offset: u32(p), size: u32(p + 8) });
  const metadata = [u16(p), u16(p + 2), u16(p + 4)];
  const width = u16(p + 6),
    height = u16(p + 8),
    count = u16(p + 10);
  p += 12;
  const frames = [];
  for (let i = 0; i < count; i++, p += 12)
    frames.push({
      address: u32(p),
      left: u16(p + 4),
      top: u16(p + 6),
      right: u16(p + 8),
      bottom: u16(p + 10),
    });
  const blocks = descriptors.map(({ offset, size }) => {
    const result = new Uint8Array(size);
    let src = p + offset,
      dst = 0;
    while (src < bytes.length) {
      const command = bytes[src++];
      if (!(command & 128)) {
        if (dst >= size) throw new Error("SPR literal overflow");
        result[dst++] = command;
        continue;
      }
      const length = (command >> 3) & 15;
      let distance = ((command & 7) << 8) | bytes[src++];
      if (!length && !distance) break;
      const run = length ? length + 2 : bytes[src++] + 18;
      if (length) distance++;
      if (distance > dst || dst + run > size)
        throw new Error("Invalid SPR back reference");
      for (let j = 0; j < run; j++) {
        result[dst] = result[dst - distance];
        dst++;
      }
    }
    if (dst !== size) throw new Error("Incomplete SPR block");
    return result;
  });
  for (const frame of frames) {
    const block = blocks[frame.address >>> 24];
    const offset = frame.address & 0xffffff;
    const size = (frame.right - frame.left) * (frame.bottom - frame.top);
    if (
      !block ||
      offset + size > block.length ||
      frame.right < frame.left ||
      frame.bottom < frame.top
    )
      throw new Error("Invalid SPR frame bounds");
    frame.pixels = block.subarray(offset, offset + size);
  }
  return { width, height, metadata, palette, frames };
}

export function spriteFrameRGBA(sprite, index) {
  const rgba = new Uint8ClampedArray(sprite.width * sprite.height * 4);
  const frame = sprite.frames[index % sprite.frames.length];
  let source = 0;
  for (let y = frame.top; y < frame.bottom; y++)
    for (let x = frame.left; x < frame.right; x++) {
      const color = frame.pixels[source++] * 4;
      // circle25 includes scanline padding beyond its declared 50px canvas.
      if (x >= sprite.width || y >= sprite.height) continue;
      rgba.set(
        sprite.palette.subarray(color, color + 4),
        (y * sprite.width + x) * 4,
      );
    }
  return rgba;
}
