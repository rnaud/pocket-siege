// 004A7D50: terrain tool masks have their own IDs, distinct from collision
// shapes. Mask3 is used by the Fire Punch entry, exit and per-frame tick.
export const FIRE_PUNCH_CUT_REGION = [200, 3, 219, 26, 209, 17];

// Original004A7D50 stores tool IDs at terrain+0x84+id*4.
export const TOOL_CUT_REGIONS = {
  1: [46, 36, 65, 54, 55, 45],
  2: [104, 8, 123, 34, 113, 19],
  3: FIRE_PUNCH_CUT_REGION,
  4: [136, 8, 155, 27, 145, 19],
  5: [165, 6, 188, 29, 176, 17],
  6: [320, 0, 352, 32, 337, 19],
  7: [256, 0, 288, 32, 273, 19],
  8: [288, 0, 320, 32, 305, 19],
  9: [256, 32, 288, 64, 273, 51],
  10: [320, 32, 352, 64, 337, 51],
  11: [288, 32, 320, 64, 305, 51],
  12: [224, 0, 230, 6, 227, 3],
  13: [224, 8, 229, 13, 226, 10],
  14: [224, 16, 228, 20, 226, 18],
  15: [224, 24, 227, 27, 225, 25],
};

export function nativeTerrainToolMasks(source) {
  const image = { ...source, pixels: source.pixels.slice() };
  // Preserve the original +2-pixel mirror alignment (destination354-x).
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 96; x++)
      image.pixels[(y + 32) * image.width + 354 - x] =
        image.pixels[y * image.width + 256 + x];
  return Object.fromEntries(Object.entries(TOOL_CUT_REGIONS).map(([id, region]) =>
    [id, nativeTerrainCutMask(image, region)]));
}

// 004A7660: padded source silhouette plus an 11x11 square dilation for the
// shaded rim. The rim contains the hole too; the blitter only colors solid land.
export function nativeTerrainCutMask(image, region) {
  const [left, top, right, bottom, x, y] = region;
  const width = right - left + 10, height = bottom - top + 10;
  const hole = [], rim = new Set();
  for (let py = top; py < bottom; py++)
    for (let px = left; px < right; px++) {
      if (!image.pixels[py * image.width + px]) continue;
      const hx = px - left + 5, hy = py - top + 5;
      hole.push([hx, hy]);
      for (let dy = -5; dy <= 5; dy++)
        for (let dx = -5; dx <= 5; dx++)
          rim.add((hy + dy) * width + hx + dx);
    }
  return {
    width, height, anchorX: x - left + 5, anchorY: y - top + 5, hole,
    rim: [...rim].sort((a,b) => a-b).map(i => [i % width, Math.floor(i / width)]),
  };
}

// 004A89B0: place the selected mask at its anchor, clear its hole, then
// shade remaining solid pixels. Host terrain is upward-positive Y.
export function carveNativeToolMask(terrain, width, height, mask, x, y, rim, locked = false) {
  if (locked) return 0;
  const left = x - mask.anchorX, top = y - mask.anchorY;
  const index = ([dx,dy]) => {
    const px = left + dx, py = height - (top + dy);
    return px >= 0 && py >= 0 && px < width && py < height ? py * width + px : -1;
  };
  let removed = 0;
  for (const point of mask.hole) {
    const i = index(point);
    if (i < 0) continue;
    removed += terrain[i];
    terrain[i] = 0;
  }
  if (rim) for (const point of mask.rim) {
    const i = index(point);
    if (i >= 0 && terrain[i]) rim[i] = 1;
  }
  return removed;
}
