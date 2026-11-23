import {
  nativeSimpleBodyTick,
  nativeSimpleBounce,
  nativeBodyAwake,
} from "./motion.js";
// Verified numeric constructor blocks 004F4021–004F414D / 004D5282–004D52F8.
export function nativeGraveBody(x, y, friction = 96) {
  return {
    enabled: 1,
    complex: 0,
    suspended: 0,
    mass: 0x10000,
    radius: 0x100000,
    waterDrag: 0xcccc,
    drag: 0x10000,
    windScale: 0,
    gravityScale: 0x10000,
    restitutionX: 0x9999,
    restitutionY: 0x9999,
    tangent: Math.trunc(((friction & 255) << 16) / 100),
    x: x | 0,
    y: y | 0,
    angle: 0,
    vx: 0,
    vy: -0x20000,
    angularVelocity: 0,
    skimScale: 0x10000,
    sleeping: 0,
    submerged: 0,
    contact: 0,
    moving: 0,
    flags: 0x400002,
  };
}
export function stepNativeGraveBody(body, environment, terrainCollision, earthquake) {
  const collide = (x, y) => (body.flags & 2 ? terrainCollision(x, y) : 0);
  const next = nativeSimpleBodyTick(body, environment, {
    awake: nativeBodyAwake,
    collide,
    earthquake,
    bounce: (b, hit, side) =>
      Object.assign(b, nativeSimpleBounce(b, { vx: 0, vy: 0 }, side).body),
  });
  // 004D55E0 applies virtual +0x78 on first submersion; 004D0FE0 assigns flags.
  if (next.submerged) next.flags = 0x400000;
  return next;
}
