import { fixedMultiply } from './numeric.js';
import { nativeSin, nativeCos } from './trig.js';
import { nativeWaterMotion } from './motion.js';
import { nativeRopeMotion } from './rope-motion.js';

// Original004CA320 constrained-body path. Earthquake effects and collision
// responses are interfaces; the rope solver and water arithmetic are native.
export function nativeRopeBodyTick(input, environment, callbacks) {
  const body = { ...input, segments: [...input.segments] };
  const collide = (x, y, candidate = body) => callbacks.collide(x, y, candidate);
  if (!body.enabled || body.suspended) return body;
  if (((environment.frame + environment.index) | 0) % 13 === 0 || callbacks.awake(body)) body.sleeping = 0;
  if (body.sleeping) {
    if (environment.earthquake) callbacks.earthquake?.(body, environment.earthquake);
    return body;
  }
  callbacks.refresh?.(body);
  const submerged = body.submerged;
  body.submerged = body.contact = body.moving = 0;
  const water = nativeWaterMotion(body, environment.waterY, submerged, collide);
  Object.assign(body, { y: water.y, vx: water.vx, vy: water.vy, submerged: water.submerged });
  if (water.skim) callbacks.skim?.(body);
  if (!water.result) {
    const gravity = fixedMultiply(environment.gravity, body.gravityScale);
    if (gravity) { body.moving = 1; body.vy = (body.vy + gravity) | 0; }
  }
  if (body.submerged !== submerged) callbacks.waterChanged?.(body);
  body.vx = fixedMultiply(body.vx, body.ropeFriction);
  body.vy = fixedMultiply(body.vy, body.ropeFriction);
  let remaining = 65536;
  for (let i = 0; i < 10 && remaining; i++) {
    const motion = nativeRopeMotion(body, remaining, {
      terrain: callbacks.terrain,
      collide,
    });
    Object.assign(body, motion.body);
    remaining = motion.remaining;
    if (motion.hit) callbacks.bounce?.(body, motion.hit);
  }
  let direction = 0;
  for (let i = 0; i < body.segmentCount; i++) direction = (direction + body.segments[i * 2 + 1]) | 0;
  body.angle = (direction + 0x8000) & 65535;
  direction &= 65535;
  const tangent = (fixedMultiply(body.vx, nativeCos(direction)) + fixedMultiply(body.vy, nativeSin(direction))) | 0;
  if (direction <= 0x8000 ? direction < body.angleDamping && tangent < 0
    : 0x10000 - direction < body.angleDamping && tangent > 0) {
    body.vx = Math.trunc(Math.imul(body.vx, 19) / 20) | 0;
    body.vy = Math.trunc(Math.imul(body.vy, 19) / 20) | 0;
  }
  body.angularVelocity = 0;
  body.vx = Math.max(-0x200000, Math.min(0x200000, body.vx));
  body.vy = Math.max(-0x200000, Math.min(0x200000, body.vy));
  if (!body.vx && !body.vy && collide(body.x, (body.y + 65536) | 0)) body.moving = 0;
  if (environment.earthquake && !body.moving) callbacks.earthquake?.(body, environment.earthquake);
  if (!callbacks.awake(body)) body.sleeping = 1;
  return body;
}
