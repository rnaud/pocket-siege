// 004A7D50: terrain tool masks have their own IDs, distinct from collision
// shapes. Mask3 is used by the Fire Punch entry, exit and per-frame tick.
export const FIRE_PUNCH_CUT_REGION = [200, 3, 219, 26, 209, 17];

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
