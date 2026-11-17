import { nativeBodyBase } from './mine-body.js';

// 004D0D30. Task registration and shared render-order allocation remain
// caller-owned. The original settles downward only as far as the water line.
export function nativeBarrelBody(x, y, settle, water, friction, collide) {
  const body = { ...nativeBodyBase(friction, 17, 9), disabled: 0,
    damage: 0, threshold: 50, bubbleProgress: 0, flags: 2 };
  const place = () => { body.x = x; body.y = y; body.sleeping = 0; };
  if (!collide(x, y, body)) place();
  Object.assign(body, { flags: 0x40180e, restitutionX: 0, windScale: 0,
    restitutionY: 0x8000, mass: 65536, enabled: 1 });
  if (settle) while ((y >> 16) < water) {
    if (collide(x, y, body)) break;
    place();
    y = (y + 65536) | 0;
  }
  return body;
}
