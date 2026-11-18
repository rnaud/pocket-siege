import {nativeDecodeSpriteBlock} from './sprite-bitmap.js';

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
    ![128, 192].includes(bytes[9])
  )
    throw new Error("Unsupported SPR header");
  const colors = u16(10);
  const palette = new Uint8Array((colors + 1) * 4);
  for (let i = 0; i < colors; i++) {
    palette.set(bytes.subarray(12 + i * 3, 15 + i * 3), (i + 1) * 4);
    palette[(i + 1) * 4 + 3] = 255;
  }
  let p = 12 + colors * 3;
  const compressed = !!(bytes[9] & 64);
  const blockCount = compressed ? u16(p) : 0;
  if (compressed) p = (p + 2 + 3) & ~3;
  const descriptors = [];
  for (let i = 0; i < blockCount; i++, p += 12)
    descriptors.push({ offset: u32(p), size: u32(p + 8) });
  const metadata = [u16(p), u16(p + 2), u16(p + 4)];
  const width = u16(p + 6),
    height = u16(p + 8),
    count = u16(p + 10);
  p = (p + 12 + 3) & ~3;
  const frames = [];
  for (let i = 0; i < count; i++, p += 12)
    frames.push({
      address: u32(p),
      left: view.getInt16(p + 4, true),
      top: view.getInt16(p + 6, true),
      right: view.getInt16(p + 8, true),
      bottom: view.getInt16(p + 10, true),
    });
  const blocks = descriptors.map(({ offset, size }) => {
    const result = new Uint8Array(size);
    const sourceBase=0x10000000,mappingBase=0x20000000;
    let written=0;
    // The recovered decoder operates on addresses. This bounded adapter keeps
    //file validation at the browser boundary and supplies an identity palette;
    //the shared game palette is allocated later in native descriptor order.
    nativeDecodeSpriteBlock({
      byte(address) {
        if(address>=mappingBase) {
          const index=address-mappingBase;
          if(index>255)throw new Error("Invalid SPR palette index");
          return index;
        }
        if(address>=sourceBase) {
          const index=address-sourceBase;
          if(index>=bytes.length)throw new Error("Incomplete SPR block");
          return bytes[index];
        }
        if(address<0||address>=written)throw new Error("Invalid SPR back reference");
        return result[address];
      },
      putByte(address,value) {
        if(address<0||address>=size)throw new Error("SPR block overflow");
        result[address]=value;written=address+1;
      },
    },0,sourceBase+p+offset,mappingBase);
    if(written!==size)throw new Error("Incomplete SPR block");
    return result;
  });
  if (!compressed) blocks.push(bytes.subarray(p));
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

// 004AF790 allocates each source RGB in file order, truncates the native
// result to a byte (including-1 ->255), and forces source index0 to0.
export function nativeSpritePaletteMap(sprite, palette) {
  const mapping = new Uint8Array(sprite.palette.length / 4);
  for (let index = 1; index < mapping.length; index++) {
    const offset = index * 4;
    mapping[index] = palette.add(Array.from(sprite.palette.subarray(offset, offset + 3)));
  }
  return mapping;
}

export function spriteFrameRGBA(sprite, index, sharedPalette = null) {
  const rgba = new Uint8ClampedArray(sprite.width * sprite.height * 4);
  const frame = sprite.frames[index % sprite.frames.length];
  let source = 0;
  for (let y = frame.top; y < frame.bottom; y++)
    for (let x = frame.left; x < frame.right; x++) {
      const sourceIndex = frame.pixels[source++];
      // circle25 includes scanline padding beyond its declared 50px canvas.
      if (x < 0 || y < 0 || x >= sprite.width || y >= sprite.height) continue;
      if (sharedPalette) {
        const index = sharedPalette.mapping[sourceIndex];
        if (index === 0) continue;
        const offset = (y * sprite.width + x) * 4;
        rgba.set(sharedPalette.colors[index], offset);
        rgba[offset + 3] = 255;
        continue;
      }
      const color = sourceIndex * 4;
      rgba.set(
        sprite.palette.subarray(color, color + 4),
        (y * sprite.width + x) * 4,
      );
    }
  return rgba;
}
