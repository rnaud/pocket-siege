import { fixedDivide, fixedMultiply } from './numeric.js';

// Bundled MSVCRT78022F30 and short-sort780230E0, specialized to pointer entries.
// Array.sort is stable, while the original swaps equal-key entries too.
export function nativeDrawSort(entries) {
  const compare = (a, b) => (a[1] - b[1]) | 0; //004C5190
  const swap = (a, b) => { [entries[a], entries[b]] = [entries[b], entries[a]]; };
  const pending = [[0, entries.length - 1]];
  while (pending.length) {
    const [low, high] = pending.pop();
    if (high <= low) continue;
    if (high - low + 1 <= 8) {
      for (let end = high; end > low; end--) {
        let max = low;
        for (let i = low + 1; i <= end; i++)
          if (compare(entries[i], entries[max]) > 0) max = i;
        swap(max, end);
      }
      continue;
    }
    swap(low, low + ((high - low + 1) >>> 1));
    let left = low, right = high + 1;
    for (;;) {
      do { left++; } while (left <= high && compare(entries[left], entries[low]) <= 0);
      do { right--; } while (right > low && compare(entries[right], entries[low]) >= 0);
      if (right < left) break;
      swap(left, right);
    }
    swap(low, right);
    // Original visits the smaller partition first and stacks the larger one.
    const a = [low, right - 1], b = [left, high];
    if ((right - low) * 4 - 1 >= (high - left) * 4) pending.push(a, b);
    else pending.push(b, a);
  }
  return entries;
}

//004C3FA0 and the type4 branch of004C42D0. Other primitive types remain separate.
export class NativeSpriteDrawQueue {
  constructor(available = 0x10000) {
    this.available = available;
    this.records = [];
  }
  draw(order, x, y, z, sprite, progress) {
    if (this.records.length >= 0x400) return;
    const remaining = (this.available - 0x24) | 0;
    if (remaining < 0) return;
    this.available = remaining;
    this.records.push([4, order | 0, 0, x & 0xffff0000, y & 0xffff0000,
      z & 0xffff0000, 0, sprite | 0, progress | 0]);
  }
  flush(view, draw) {
    nativeDrawSort(this.records);
    const cameraX = (view.x + 0x8000) & 0xffff0000;
    const cameraY = (view.y + 0x8000) & 0xffff0000;
    for (let i = this.records.length - 1; i >= 0; i--) {
      const r = this.records[i];
      const depth = (r[5] - view.z + view.distance) | 0;
      if (depth <= 0) continue;
      const scale = fixedDivide(view.distance, depth);
      const x = fixedMultiply((r[3] - cameraX) | 0, scale);
      const y = fixedMultiply((r[4] - cameraY) | 0, scale);
      // The original computes an unused secondary scale here too.
      if (r[5] !== depth) fixedMultiply(scale,
        fixedDivide((view.distance + r[5]) | 0, view.distance));
      draw(x, y, r[7], r[8]);
    }
  }
}
