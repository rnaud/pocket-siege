import { nativeVectorLength } from './blast-damage.js';
import { fixedDivide } from './numeric.js';

const abs = value => { const sign = value >> 31; return ((value ^ sign) - sign) | 0; };

// 004D4010. The caller invokes this when the flame's hit-delay gate opens.
export function nativeFlameHit(input, candidates, interfaces) {
  const body = { ...input };
  if (!body.enabled) return body;
  const radius = (Math.imul(body.strength, 15) + 0x50000) | 0;
  const target = candidates.find(candidate =>
    ((1 << candidate.type) & 0x2003c) &&
    abs((body.x - candidate.x) | 0) < radius &&
    abs((body.y - candidate.y) | 0) < radius);
  if (!target) return body;
  let dx = (target.x - body.x) | 0;
  let dy = (target.y - body.y - 0x80000) | 0;
  const length = nativeVectorLength(dx, dy);
  if (length) { dx = fixedDivide(dx, length); dy = fixedDivide(dy, length); }
  dy = (dy + (dy < 0 ? -0x4ccc : 0x4ccc)) | 0;
  interfaces.hit(target, 0x433, 0x124, [1, body.x, body.y,
    (dx + Math.trunc(body.vx / 8)) | 0,
    (dy + Math.trunc(body.vy / 8)) | 0, body.damage]);
  body.hitDelay = (interfaces.logicRandom() & 0x7f) + 100;
  interfaces.smoke([0x10ff00, body.x, body.y,
    (interfaces.visualRandom() & 0xffff) - 0x8000,
    (interfaces.visualRandom() & 0xffff) - 0x8000,
    0x330, Math.trunc((interfaces.visualRandom() & 0xffff) / 200) + 0x20c]);
  if (body.persistent) {
    body.strength = (body.strength - Math.imul(body.decay, 30)) | 0;
    interfaces.busy();
  }
  return body;
}
