import { fixedMultiply } from "./numeric.js";

// 004EE8A0 consumes a logic draw even when the weapon's variance is zero.
export function nativeDamageVariation(damage, variance, random) {
  const amount = Math.trunc(Math.imul(variance, damage) / 100);
  return (
    (Math.trunc((Math.imul(random() & 255, amount) >>> 0) / 255) -
      amount +
      damage) |
    0
  );
}

// 004FC020. Collision traversal is supplied by the separately verified body
// and terrain ports. Preserve event damage and area damage as distinct values.
export function nativeHitscanResolution(shot, config, body, terrain, random) {
  const {
    mode,
    push,
    damage,
    variance,
    range,
    collisionMask,
    extentFactor,
    impulseNumerator,
    impulseDenominator,
  } = config;
  const strength = nativeDamageVariation(damage, variance, random);
  if (!(collisionMask & 2)) terrain = -1;
  const distance =
    body < 0 || (terrain >= 0 && terrain < body) ? terrain : body;
  const x = shot[2],
    y = shot[3],
    dx = shot[4],
    dy = shot[5];
  if (distance < 0) {
    // Native consumes Y jitter before X jitter, including for zero components.
    const endY =
      (y + Math.imul(dy, range) + (fixedMultiply(dy, random() & 0xffff) << 4)) |
      0;
    const endX =
      (x + Math.imul(dx, range) + (fixedMultiply(dx, random() & 0xffff) << 4)) |
      0;
    return { effect: [mode, endX, endY, strength] };
  }
  const endX = (x + Math.imul(dx, distance)) | 0,
    endY = (y + Math.imul(dy, distance)) | 0,
    extent = Math.max(16, Math.imul(extentFactor, damage)) << 16;
  const impulse = (direction) =>
    Math.trunc(
      Math.imul(Math.trunc(Math.imul(push, direction) / 30), impulseNumerator) /
        impulseDenominator,
    );
  return {
    event: [mode, endX, endY, push, strength, 0],
    area: [
      endX,
      endY,
      extent,
      extent,
      damage,
      impulse(dx),
      impulse(dy),
      3,
      0,
      0,
      0x21c4c,
      0,
    ],
  };
}
