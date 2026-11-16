import { fixedMultiply, fixedDivide } from "./numeric.js";
// 0049C440 polynomial for |ratio| <= 1.
function atan(ratio) {
  const square = fixedMultiply(ratio, ratio);
  let value = fixedMultiply(0x555, square);
  for (const coefficient of [-0x15cb, 0x2e1d, -0x548e])
    value = fixedMultiply(value + coefficient, square);
  return fixedDivide(fixedMultiply(value + 0xfff7, ratio), 0x6487e);
}
// 0049C030. Angle measured clockwise from positive y in 16-bit turns.
export function nativeVectorAngle(x, y) {
  x |= 0;
  y |= 0;
  const ax = Math.abs(x),
    ay = Math.abs(y);
  if (((ax + ay) | 0) < 6) return 0;
  if (ax <= ay)
    return (atan(fixedDivide(x, y)) + (y < 0 ? -0x8000 : 0)) & 0xffff;
  return ((x < 0 ? -0x4000 : 0x4000) - atan(fixedDivide(y, x))) & 0xffff;
}
// 004DB8E4–004DB915: three fly shapes vary with world displacement.
export function nativeFlightSprite(x, y) {
  let phase = Math.trunc((((x | 0) + (y | 0)) >> 16) / 20) & 3;
  if (phase > 2) phase = 4 - phase;
  return 13 + phase;
}
// 004DEC71–004DECC2 mirrors velocity angle around half a turn.
export function nativeFlightProgress(vx, vy, previous = 0) {
  if (!vx && !vy) return previous;
  let progress = nativeVectorAngle(vx, -vy) * 2;
  if (progress > 0x10000) progress = 0x20000 - progress;
  return fixedMultiply(progress, 0xffff);
}
