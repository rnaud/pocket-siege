// In-game palette004ADAC0/004ADCB0/004ADC60/004ADF60. These are
// distinct executable routines from the previously recovered Landgen palette.
export class NativeGamePalette {
  constructor(first, last) {
    this.first = first;
    this.last = last;
    this.colors = Array.from({ length: 256 }, () => [0, 0, 0]);
    this.changed = new Uint8Array(256);
    this.used = [];
    this.free = [];
    this.cursor = 0;
    this.dirty = false;
    for (let index = last; index >= first; index--) this.free.push(index);
  }
  add(input) {
    const color = input.map(value => (value << 16) >> 16);
    for (const index of this.used)
      if (index !== 0 && this.colors[index].every((value, channel) => value === color[channel])) return index;
    if (!this.free.length) return -1;
    const index = this.free.pop();
    this.used.push(index);
    this.colors[index] = color;
    this.changed[index] = 1;
    this.dirty = true;
    return index;
  }
  read(index) {
    return index >= this.first && index <= this.last && this.changed[index]
      ? [...this.colors[index]] : null;
  }
  next() {
    if (this.cursor >= this.used.length) return null;
    const index = this.used[this.cursor++];
    return [index, [...this.colors[index]]];
  }
  // 004A6ED0 copies palette state without changing object identity.
  copyFrom(source) {
    this.first = source.first;
    this.last = source.last;
    this.colors = source.colors.map(color => [...color]);
    this.changed = source.changed.slice();
    this.used = [...source.used];
    this.free = [...source.free];
    this.cursor = source.cursor;
    this.dirty = source.dirty;
    return this;
  }
}
