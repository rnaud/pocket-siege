import { nativeWormState, nativeWormCollisionType } from "./worm-collision-type.js";
import { fixedMultiply } from "./numeric.js";
// 004FBEA0. Origin is integer pixels; direction and body positions are 16.16.
// The native routine returns distance; body identity is retained for the host adapter.
export function nativeHitscanBody(bodies, x, y, dx, dy, limit, mask) {
  mask &= 0xffbffffd;
  let distance = -1,
    body = null,
    nearest = limit;
  for (const candidate of bodies) {
    if (!(mask & (1 << (candidate.type & 31))) || candidate.self) continue;
    const rx = (candidate.x - (x << 16)) | 0;
    const ry = (candidate.y - (y << 16)) | 0;
    const along = (fixedMultiply(ry, dy) + fixedMultiply(rx, dx)) | 0;
    const across = (fixedMultiply(ry, dx) - fixedMultiply(rx, dy)) | 0;
    const sign = across >> 31,
      perpendicular = ((across ^ sign) - sign) | 0;
    const projected = along >> 16;
    if (
      along > 0xa0000 &&
      projected < nearest &&
      perpendicular < (candidate.type === 10 ? 0x80000 : 0x100000)
    ) {
      distance = nearest = projected;
      body = candidate;
    }
  }
  return { distance, body };
}

// Worm getter004D0F50 returns the body center without a sprite/foot offset.
// Enumerate in native registry category order; retain host identity for damage.
export function nativeWormHitscanBodies(worms, shooter, height) {
  return worms.filter(worm => worm.hp > 0).map(worm => ({
    x: Math.round(worm.x * 65536) | 0,
    y: Math.round((height - worm.y) * 65536) | 0,
    type: nativeWormCollisionType(nativeWormState(worm)),
    self: worm === shooter,
    worm,
  })).sort((a, b) => a.type - b.type);
}
