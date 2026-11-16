// 004A8FB0: sample at every integer ray distance, including zero and limit.
// The origin is integer pixels, direction is signed 16.16, additions wrap.
export function nativeHitscanTerrain(x, y, dx, dy, limit, solid) {
  let px = x << 16,
    py = y << 16;
  for (let distance = 0; distance <= limit; distance++) {
    if (solid(px >> 16, py >> 16)) return distance;
    px = (px + dx) | 0;
    py = (py + dy) | 0;
  }
  return -1;
}
