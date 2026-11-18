import { fixedDivide, fixedMultiply } from "./numeric.js";

// Bundled MSVCRT78022F30 and short-sort780230E0, specialized to pointer entries.
// Array.sort is stable, while the original swaps equal-key entries too.
export function nativeDrawSort(entries) {
  const compare = (a, b) => (a[1] - b[1]) | 0; //004C5190
  const swap = (a, b) => {
    [entries[a], entries[b]] = [entries[b], entries[a]];
  };
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
    let left = low,
      right = high + 1;
    for (;;) {
      do {
        left++;
      } while (left <= high && compare(entries[left], entries[low]) <= 0);
      do {
        right--;
      } while (right > low && compare(entries[right], entries[low]) >= 0);
      if (right < left) break;
      swap(left, right);
    }
    swap(low, right);
    // Original visits the smaller partition first and stacks the larger one.
    const a = [low, right - 1],
      b = [left, high];
    if ((right - low) * 4 - 1 >= (high - left) * 4) pending.push(a, b);
    else pending.push(b, a);
  }
  return entries;
}

const truncate = (value) => value & 0xffff0000;

// 004C3BC0..004C4230 insert the eleven renderer records; 004C42D0 sorts and
// projects them through nine renderer vtable entries. Records keep the original
// word layout so callers can compare them directly with native captures.
export class NativeSpriteDrawQueue {
  constructor(available = 0x10000) {
    this.available = available;
    this.records = [];
  }
  // Shared capacity check from every insertion routine.
  push(size, record) {
    if (this.records.length >= 0x400) return false;
    const remaining = (this.available - size) | 0;
    if (remaining < 0) return false;
    this.available = remaining;
    this.records.push(record);
    return true;
  }
  //004C3E80 line: order,x1,y1,x2,y2,z,flags
  line(order, x1, y1, x2, y2, z, flags) {
    return this.push(0x20, [
      0,
      order | 0,
      flags | 0,
      truncate(x1),
      truncate(y1),
      truncate(x2),
      truncate(y2),
      truncate(z),
    ]);
  }
  //004C40E0 raw image record; coordinates reach the renderer unprojected.
  imageRaw(order, x, y, first, second, third, fourth, fifth, sixth) {
    return this.push(0x28, [
      1,
      order | 0,
      truncate(x),
      truncate(y),
      first | 0,
      second | 0,
      third | 0,
      fourth | 0,
      fifth | 0,
      sixth | 0,
    ]);
  }
  //004C4180 projected image: order,x,y,z,image,sx,sy,width,height,flags
  image(order, x, y, z, image, sourceX, sourceY, width, height, flags) {
    return this.push(0x34, [
      2,
      order | 0,
      0,
      truncate(x),
      truncate(y),
      truncate(z),
      0,
      image | 0,
      sourceX | 0,
      sourceY | 0,
      width | 0,
      height | 0,
      flags | 0,
    ]);
  }
  //004C3F20 raw sprite record; coordinates reach the renderer unprojected.
  spriteRaw(order, x, y, sprite, progress) {
    return this.push(0x18, [
      3,
      order | 0,
      truncate(x),
      truncate(y),
      sprite | 0,
      progress | 0,
    ]);
  }
  //004C3FA0 projected sprite: order,x,y,z,sprite,progress
  draw(order, x, y, z, sprite, progress) {
    return this.push(0x24, [
      4,
      order | 0,
      0,
      truncate(x),
      truncate(y),
      truncate(z),
      0,
      sprite | 0,
      progress | 0,
    ]);
  }
  //004C4040 projected sprite with a mirrored second depth and flag word.
  spriteTwin(order, x, y, z, secondZ, flags, sprite, progress) {
    return this.push(0x24, [
      4,
      order | 0,
      flags | 0,
      truncate(x),
      truncate(y),
      truncate(z),
      truncate(secondZ),
      sprite | 0,
      progress | 0,
    ]);
  }
  //004C3CC0 projected polyline: order,points,payload
  polyline(order, points, payload) {
    const list = points.flatMap((point) => [
      point[0] | 0,
      point[1] | 0,
      point[2] | 0,
    ]);
    return this.push(0x1c + points.length * 0xc, [
      6,
      order | 0,
      points.length | 0,
      payload | 0,
      ...list,
    ]);
  }
  //004C3D60 projected polygon: order,points,first,second
  polygon(order, points, first, second) {
    const list = points.flatMap((point) => [
      point[0] | 0,
      point[1] | 0,
      point[2] | 0,
    ]);
    return this.push(0x20 + points.length * 0xc, [
      7,
      order | 0,
      points.length | 0,
      first | 0,
      second | 0,
      ...list,
    ]);
  }
  //004C3E00 screen-space sprite: order,x,y,z,first,second
  screenSprite(order, x, y, z, first, second) {
    return this.push(0x1c, [
      8,
      order | 0,
      first | 0,
      second | 0,
      x | 0,
      y | 0,
      z | 0,
    ]);
  }
  //004C3BC0 screen-space point; the original also projects and discards X.
  screenPoint(order, y, z, value) {
    return this.push(0x14, [9, order | 0, y | 0, z | 0, value | 0]);
  }
  //004C4230 projected image with a mirrored second depth and flag word.
  imageTwin(order, x, y, z, first, second) {
    return this.push(0x24, [
      10,
      order | 0,
      0,
      truncate(x),
      truncate(y),
      truncate(z),
      0,
      first | 0,
      second | 0,
    ]);
  }
  // Existing sprite/image adapter. Other record types stay silent unless a
  // caller uses flushAll with the matching renderer entry.
  flush(view, draw, image) {
    return this.flushAll(view, { sprite: draw, image });
  }
  flushAll(view, host = {}) {
    nativeDrawSort(this.records);
    const cameraX = (view.x + 0x8000) & 0xffff0000;
    const cameraY = (view.y + 0x8000) & 0xffff0000;
    const distance = view.distance | 0;
    const viewZ = view.z | 0;
    const project = (x, y, z) => {
      const depth = ((z | 0) - viewZ + distance) | 0;
      if (depth <= 0) return null;
      const scale = fixedDivide(distance, depth);
      const projectedX = fixedMultiply((x - cameraX) | 0, scale);
      const projectedY = fixedMultiply((y - cameraY) | 0, scale);
      // Original computes an unused secondary scale for off-camera depths.
      if ((z | 0) !== depth)
        fixedMultiply(scale, fixedDivide((distance + (z | 0)) | 0, distance));
      return [projectedX, projectedY];
    };
    for (let index = this.records.length - 1; index >= 0; index--) {
      const record = this.records[index];
      switch (record[0]) {
        case 0: {
          const first = project(record[3], record[4], record[7]);
          if (!first) break;
          const second = project(record[5], record[6], record[7]);
          if (!second) break;
          host.line?.(
            first[0] >> 16,
            first[1] >> 16,
            second[0] >> 16,
            second[1] >> 16,
            record[2],
          );
          break;
        }
        case 1:
          host.image?.(...record.slice(2, 10));
          break;
        case 2: {
          const first = project(record[3], record[4], record[5]);
          if (!first) break;
          let x = first[0],
            y = first[1];
          if (record[2]) {
            const second = project(record[3], record[4], record[6]);
            if (!second) break;
            if (record[2] & 1) x = second[0];
            if (record[2] & 2) y = second[1];
          }
          host.image?.(x, y, ...record.slice(7, 13));
          break;
        }
        case 3:
          host.sprite?.(...record.slice(2, 6));
          break;
        case 4: {
          const first = project(record[3], record[4], record[5]);
          if (!first) break;
          let x = first[0],
            y = first[1];
          if (record[2]) {
            const second = project(record[3], record[4], record[6]);
            if (!second) break;
            if (record[2] & 1) x = second[0];
            if (record[2] & 2) y = second[1];
          }
          host.sprite?.(x, y, record[7], record[8]);
          break;
        }
        case 5:
          host.dataList?.(record.slice(4), record[2], record[3]);
          break;
        case 6: {
          const count = record[2] | 0;
          let previous = project(record[4], record[5], record[6]);
          if (!previous) break;
          for (let point = 1; point < count; point++) {
            const current = project(
              record[4 + point * 3],
              record[5 + point * 3],
              record[6 + point * 3],
            );
            if (!current) break;
            host.polyline?.(
              previous[0],
              previous[1],
              current[0],
              current[1],
              record[3],
            );
            previous = current;
          }
          break;
        }
        case 7: {
          const count = record[2] | 0;
          let previous = project(record[5], record[6], record[7]);
          if (!previous) break;
          for (let point = 1; point < count; point++) {
            const current = project(
              record[5 + point * 3],
              record[6 + point * 3],
              record[7 + point * 3],
            );
            if (!current) break;
            host.polygon?.(
              previous[0],
              previous[1],
              current[0],
              current[1],
              record[3],
              record[4],
            );
            previous = current;
          }
          break;
        }
        case 8: {
          const projected = project(record[4], record[5], record[6]);
          if (!projected) break;
          host.screenSprite?.(
            projected[0] >> 16,
            projected[1] >> 16,
            record[2],
            record[3],
          );
          break;
        }
        case 9: {
          const depth = (record[3] - viewZ + distance) | 0;
          if (depth <= 0) break;
          const scale = fixedDivide(distance, depth);
          // The original projects the discarded X coordinate as well.
          fixedMultiply(-cameraX | 0, scale);
          const y = fixedMultiply((record[2] - cameraY) | 0, scale);
          if (depth !== record[3])
            fixedMultiply(
              scale,
              fixedDivide((distance + record[3]) | 0, distance),
            );
          host.point?.(y >> 16, record[4]);
          break;
        }
        case 10: {
          const first = project(record[3], record[4], record[5]);
          if (!first) break;
          let x = first[0],
            y = first[1];
          if (record[2]) {
            const second = project(record[3], record[4], record[6]);
            if (!second) break;
            if (record[2] & 1) x = second[0];
            if (record[2] & 2) y = second[1];
          }
          host.imageTwin?.(x, y, record[7], record[8]);
          break;
        }
      }
    }
  }
}
