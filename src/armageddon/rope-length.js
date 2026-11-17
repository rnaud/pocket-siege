import { nativeSin, nativeCos } from './trig.js';
import { fixedMultiply, fixedDivide } from './numeric.js';

// Original004F53E0: change a constrained body's rope length. Segment pairs
// hold motion and relative angle. Shortening keeps unused buffer words;
// extending initializes newly used pairs only after successful placement.
export function nativeRopeLength(input, length, tryPosition) {
  const body = { ...input, segments: [...input.segments] }, calls = [];
  const done = result => ({ body, calls, result });
  length |= 0;
  if (!body.constrained || length < 0xa0000) return done(0);
  const count = (Math.trunc(length / 8) >> 16) + 1;
  const shortening = length < body.length;
  if (!shortening && count > 64) return done(0);
  const full = (shortening ? count : body.segmentCount) - 1;
  let angle = 0, x = body.anchorX, y = body.anchorY;
  for (let i = 0; i < full; i++) {
    angle = (angle + body.segments[i * 2 + 1]) | 0;
    x = (x + Math.imul(nativeSin(angle), 8)) | 0;
    y = (y - Math.imul(nativeCos(angle), 8)) | 0;
  }
  const remaining = (length - Math.imul(full, 0x80000)) | 0;
  angle = (angle + body.segments[full * 2 + 1]) | 0;
  x = (x + fixedMultiply(nativeSin(angle), remaining)) | 0;
  y = (y + fixedMultiply(-nativeCos(angle) | 0, remaining)) | 0;
  calls.push({ operation: 'tryPosition', request: [x, y] });
  if (!tryPosition(x, y, body)) return done(0);
  body.x = x; body.y = y;
  if (!shortening) {
    for (let i = body.segmentCount; i < count; i++)
      body.segments[i * 2] = body.segments[i * 2 + 1] = 0;
  }
  body.segmentCount = count;
  const ratio = fixedDivide(body.length, length);
  body.vx = fixedMultiply(body.vx, ratio);
  body.vy = fixedMultiply(body.vy, ratio);
  body.length = length;
  return done(1);
}
