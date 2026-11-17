import { nativeDirectionTurn } from './direction.js';
const abs = value => { const sign = value >> 31; return ((value ^ sign) - sign) | 0; };

// 004D4590 event3EB: airborne directional strips and settled strength strips.
export function nativeFlameArt(input) {
  const body = { ...input }, layer = (body.identity + 0x110000) | 0;
  if (body.initial) {
    if (body.vx || body.vy) body.direction = nativeDirectionTurn(body.vx, -body.vy | 0) & 0xffff;
    const speed = Math.max(0, Math.min(0x30000,
      Math.trunc(((abs(body.vx) + abs(body.vy)) | 0) / 3)));
    return { body, request: [layer, body.x, body.y, 0,
      0x2fc - (speed >> 16), body.direction & 0xffff] };
  }
  return { body, request: [layer, (body.x + body.jitterX) | 0,
    (body.y + body.jitterY) | 0, 0, 0x302 - ((body.strength << 2) >> 16), body.progress] };
}
