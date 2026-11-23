// Shape table construction in 004A5350; shape 3 is selected by the original
// worm's base constructor 004D5A40 -> 004F4000(type=2, shape=3).
export const ORIGINAL_MASK_REGIONS = {
  2: [45, 7, 52, 12, 48, 9],
  3: [13, 10, 22, 26, 17, 19],
  4: [46, 36, 65, 54, 55, 45],
  5: [0, 32, 24, 61, 12, 51],
  6: [0, 0, 1, 1, 0, 0],
  // 004A5781 scene slots 0x3C0 and 0x3C4 (ids are slot index + 1); shape 8
  // is the Donkey's.
  7: [45, 7, 46, 8, 45, 7],
  8: [371, 9, 472, 27, 418, 3],
  9: [485, 7, 505, 38, 495, 22],
};

// 004CBE20: half-open crop, source index != 0 is solid. Anchors are relative
// to the crop. Native bit-plane collision precomputes 32 horizontal shifts.
export function nativeCollisionMask(image, region) {
  const [left, top, right, bottom, x, y] = region;
  const width = right - left,
    height = bottom - top;
  const points = [];
  for (let py = 0; py < height; py++)
    for (let px = 0; px < width; px++)
      if (image.pixels[(top + py) * image.width + left + px])
        points.push([px, py]);
  return {
    width,
    height,
    anchorX: x - left,
    anchorY: y - top,
    planes: Array.from({ length: 32 }, (_, shift) => ({
      width: width + shift,
      height,
      points: points.map(([px, py]) => [px + shift, py]),
    })),
  };
}

// 004CC310/004CC0C0 overlap expressed over solid source pixels. Zero padding
// in the shifted native bit planes makes this equivalent to their word AND.
// Coordinates are integer native pixels (manager 004C97A0 shifts 16.16 first).
export function nativeCollisionOverlap(a, ax, ay, b, bx, by) {
  const leftA = (ax - a.anchorX) | 0,
    topA = (ay - a.anchorY) | 0;
  const leftB = (bx - b.anchorX) | 0,
    topB = (by - b.anchorY) | 0;
  const dx = (leftA - leftB) | 0,
    dy = (topA - topB) | 0;
  if (
    dx >= b.width ||
    dy >= b.height ||
    dx + a.width <= 0 ||
    dy + a.height <= 0
  )
    return 0;
  const points = new Set(b.planes[0].points.map(([x, y]) => y * b.width + x));
  return nativeCollisionBitmapOverlap(a, ax, ay, {
    width: b.width,
    height: b.height,
    left: leftB,
    top: topB,
    solid: (x, y) => points.has(y * b.width + x),
  });
}

// Terrain adapter: query the current bitmap directly so craters cannot leave
// stale cached occupancy. Visits only solid mask pixels, never the whole map.
// solid receives local bitmap coordinates; outside pixels are clipped away.
export function nativeCollisionBitmapOverlap(mask, x, y, bitmap) {
  const dx = (x - mask.anchorX - bitmap.left) | 0,
    dy = (y - mask.anchorY - bitmap.top) | 0;
  if (
    dx >= bitmap.width ||
    dy >= bitmap.height ||
    dx + mask.width <= 0 ||
    dy + mask.height <= 0
  )
    return 0;
  for (const [x, y] of mask.planes[0].points) {
    const px = x + dx,
      py = y + dy;
    if (
      px >= 0 &&
      py >= 0 &&
      px < bitmap.width &&
      py < bitmap.height &&
      bitmap.solid(px, py)
    )
      return 1;
  }
  return 0;
}
