// 004E9F00: first matching body in registry order. Shift each signed fixed
// delta before taking its absolute value; fractional negative deltas matter.
export function nativeMineProximity(mine, radius, candidates) {
  for (let i = 0; i < candidates.length; i++) {
    const body = candidates[i];
    if (!(mine.mask & (1 << (body.type & 31)))) continue;
    const dx = ((mine.x - body.x) | 0) >> 16;
    const dy = ((mine.y - body.y) | 0) >> 16;
    if (Math.abs(dx) + Math.abs(dy) <= radius) return i;
  }
  return -1;
}
