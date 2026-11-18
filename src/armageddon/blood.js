import schemes from "./scheme-runtime.js";
import { fixedDivide, fixedMultiply } from "./numeric.js";
import { nativeVectorLength } from "./blast-damage.js";
// 004D9670. The match's byte at +0x11D6F controls fan width; +0x1AC0
// selects wormhit2 instead of wormhit1. All five draws use logic RNG.
export function nativeBloodBurst(
  x,
  y,
  impactX,
  impactY,
  damage,
  amount,
  mode,
  gravity,
  random,
) {
  if (damage <= 2) return [];
  let dx = (x - impactX) | 0,
    dy = (y - impactY) | 0;
  const length = nativeVectorLength(dx, dy);
  if (!length) return [];
  dx = fixedDivide(dx, length);
  dy = fixedDivide(dy, length);
  const half = Math.trunc(Math.imul(amount & 255, damage) / 500);
  const speed = (Math.trunc((damage << 16) / 20) + 0x20000) | 0;
  const requests = [];
  for (let i = -half; i <= half; i++) {
    const step = Math.trunc((random() & 65535) / 100) + 0x7ae;
    const vy = (fixedMultiply(dy, speed) + (random() & 65535) * 2 - 65536) | 0;
    const vx = (fixedMultiply(dx, speed) + (random() & 65535) * 2 - 65536) | 0;
    const py = (y + (random() & 65535) - 0x8000 + Math.imul(dx, i) * 2) | 0;
    const px = (x + (random() & 65535) - 0x8000 - Math.imul(dy, i) * 2) | 0;
    requests.push([
      0x80000,
      px,
      py,
      0,
      vx,
      vy,
      0,
      gravity,
      mode ? 0x33e : 0x33d,
      0,
      65536,
      step,
    ]);
  }
  return requests;
}

// Captured scheme195 runtime byte at context+0x11D6F (zero still emits one).
export const nativeBloodAmount = schemes.schemes.find(
  (s) => s.resource_id === 195,
).bytes[0x11d6f - schemes.context_offset];
