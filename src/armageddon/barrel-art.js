// 004D1860 event3EB, including original004AAFD0 water substitution.
export function nativeBarrelArt(body, frame, rank = 0) {
  const level = Math.min(3, Math.trunc((body.damage << 2) / body.threshold));
  let sprite = (0x262 + level) | 0;
  if (body.submerged && sprite >= 610 && sprite <= 613) sprite = 687;
  return [(rank + 0x100001) | 0, body.x, body.y, 0, sprite,
    Math.trunc((frame << 16) / 50) | 0];
}
