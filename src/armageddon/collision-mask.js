// Shape table construction in 004A5350; shape 3 is selected by the original
// worm's base constructor 004D5A40 -> 004F4000(type=2, shape=3).
export const ORIGINAL_MASK_REGIONS = {
  2: [45, 7, 52, 12, 48, 9],
  3: [13, 10, 22, 26, 17, 19],
  4: [46, 36, 65, 54, 55, 45],
  5: [0, 32, 24, 61, 12, 51],
  6: [0, 0, 1, 1, 0, 0],
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
