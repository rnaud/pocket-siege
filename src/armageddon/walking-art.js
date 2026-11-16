// 004DC9D0–004DCA92: controlled walk phase advances on successful walk ticks.
export function nativeWalkingTick(previous) {
  const progress = (previous + 0xf5c) | 0;
  return { progress, cycle: progress >> 16 };
}
// 004DB89D–004DB8E4: native downward-positive slope selects linked strips.
export const nativeWalkingSprite = (slope) =>
  slope < 0 ? 0x21 : slope > 0 ? 0x22 : 0x20;
