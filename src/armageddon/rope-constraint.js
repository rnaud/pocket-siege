import { nativeVectorAngle } from './flight-art.js';
import { nativeVectorLength } from './blast-damage.js';
import { nativeSin, nativeCos } from './trig.js';
import { fixedMultiply } from './numeric.js';

// Original004F51A0. Native allocation is represented by initialized segment
// words rather than an address. Rejection after the segment limit preserves
// the native partial anchor/length writes and any accepted repositioning.
export function nativeRopeConstraint(input, anchorX, anchorY, tryPosition) {
  const body = { ...input }, calls = [];
  const done = result => ({ body, calls, result });
  if (body.constrained) return done(0);
  const dx = (body.x - anchorX) | 0, dy = (body.y - anchorY) | 0;
  const angle = nativeVectorAngle(dx, -dy | 0);
  let length = nativeVectorLength(dx, dy);
  if (length < 0xa0000) return done(0);
  const attempt = () => {
    const x = (anchorX + fixedMultiply(nativeSin(angle), length)) | 0;
    const y = (anchorY - fixedMultiply(nativeCos(angle), length)) | 0;
    calls.push({ operation: 'tryPosition', request: [x, y] });
    const accepted = tryPosition(x, y, body);
    if (accepted) { body.x = x; body.y = y; }
    return accepted;
  };
  if (!attempt()) {
    length = (length - 65536) | 0;
    if (!attempt()) return done(0);
  }
  body.anchorX = anchorX; body.anchorY = anchorY; body.length = length;
  body.segmentCount = (Math.trunc(length / 8) >> 16) + 1;
  if (body.segmentCount > 64) return done(0);
  calls.push({ operation: 'allocate', bytes: 512 });
  body.segments = Array(body.segmentCount * 2).fill(0);
  body.segments[1] = angle;
  body.constrained = 1;
  body.angle = (angle + 0x8000) & 65535;
  return done(1);
}
