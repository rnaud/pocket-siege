// LANDGEN 0040B600/0040B700/0040B760: exact RGB reuse, then allocation
// from a descending free stack. Index zero stays reserved for transparency.
export class NativeMapPalette {
  constructor(first = 1, last = 255) {
    this.colors = Array.from({ length: 256 }, () => [0, 0, 0]);
    this.used = [];
    this.free = [];
    this.changed = new Uint8Array(256);
    this.dirty = false;
    for (let i = last; i >= first; i--) this.free.push(i);
  }
  add(rgb) {
    for (const index of this.used)
      if (this.colors[index].every((value, channel) => value === rgb[channel]))
        return index;
    if (!this.free.length) return -1;
    const index = this.free.pop();
    this.used.push(index);
    this.colors[index] = [...rgb];
    this.changed[index] = 1;
    this.dirty = true;
    return index;
  }
  // 00402960 builds a byte translation table in source palette order.
  remap(image) {
    const translation = new Uint8Array(image.palette.length / 4);
    for (let i = 1; i < translation.length; i++)
      translation[i] = this.add([...image.palette.subarray(i * 4, i * 4 + 3)]);
    return {
      width: image.width,
      height: image.height,
      depth: 8,
      pixels: image.pixels.map((index) => translation[index]),
      translation,
    };
  }
  rgba() {
    const result = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
      result.set(this.colors[i], i * 4);
      result[i * 4 + 3] = 255;
    }
    return result;
  }
}
