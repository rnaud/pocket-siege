import { fixedDivide, fixedMultiply } from './numeric.js';
import { nativeVectorLength } from './blast-damage.js';

// 004D4B80, dispatched by flame event404. Blast reach uses Manhattan
// distance; the resulting velocity uses the original Euclidean normalizer.
export function nativeFlameBlast(input, packet, extentFactor = 1) {
  const body = { ...input };
  const radius = Math.imul((Math.imul(extentFactor, packet[4]) + 1) | 0, 0x40000);
  let dx = (body.x - packet[1]) | 0, dy = (body.y - packet[2]) | 0;
  let distance = ((Math.abs(dx) | 0) + (Math.abs(dy) | 0)) | 0;
  if (!radius || distance > radius || !distance) return body;
  distance = Math.max(0, distance);
  const strength = fixedMultiply(packet[4], fixedDivide((radius - distance) | 0, radius));
  body.strength = Math.min(0xffff, (body.strength + Math.trunc((strength << 16) / 100)) | 0);
  const length = nativeVectorLength(dx, dy);
  if (length) { dx = fixedDivide(dx, length); dy = fixedDivide(dy, length); }
  body.vx = (body.vx + Math.trunc(Math.imul(dx, strength) / 2)) | 0;
  body.vy = (body.vy + Math.trunc(Math.imul(dy, strength) / 2)) | 0;
  body.initial = 1;
  body.contact = 0;
  return body;
}
