import { fixedMultiply } from './numeric.js';
import { nativeBodyImpulse } from './jump.js';

const abs = value => { const sign = value >> 31; return ((value ^ sign) - sign) | 0; };
// Original004D6D10 with original004F4C60 rebound and004F4CB0 impulse.
// Object type, special contact interception and audio handles are interfaces.
export function nativeRopeContact(input, otherType, callbacks = {}) {
  const body = { ...input };
  if ((otherType === 11 || otherType === 12) && body.field154 &&
      callbacks.intercept?.(body.team, body.worm, 0x200000)) return body;
  const strength = Math.trunc(((abs(body.vx) + abs(body.vy)) | 0) / 16) | 0;
  if (body.soundHandle) callbacks.stopSound?.(body.soundHandle);
  body.soundHandle = callbacks.sound?.(35, 3, 65536, strength, 0) ?? 0;
  body.vx = -fixedMultiply(body.vx, body.ropeBounce) | 0;
  body.vy = -fixedMultiply(body.vy, body.ropeBounce) | 0;
  if (body.field2ec && ((abs(body.vx) + abs(body.vy)) | 0) < 0x100000) {
    const impulse = nativeBodyImpulse(body, body.vx, body.vy);
    Object.assign(body, { vx: impulse.vx, vy: impulse.vy, angularVelocity: impulse.angularVelocity });
    body.field2ec = 0;
  }
  return body;
}
