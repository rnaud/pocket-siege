import { nativeSin, nativeCos } from "./trig.js";
import { fixedMultiply } from "./numeric.js";
const abs = v => ((v ^ (v >> 31)) - (v >> 31)) | 0;

// 004E2CA0. Returns each child constructor's eleven-word payload in emission
// order; allocation and child construction are supplied by the caller.
export function nativeProjectileFragments(body, payload, x, y, random, construct = () => {}) {
  let direction = body.direction;
  if (direction < 0) {
    if (abs(body.impactVx) < abs(body.impactVy)) direction = body.impactVy < 0 ? 180 : 0;
    else direction = body.impactVx < 0 ? 90 : 270;
  }
  const baseAngle = Math.trunc((direction << 16) / 360), children = [];
  for (let i = 1; i <= body.count; i++) {
    const speed = Math.trunc((body.speed << 16) / 100);
    const variance = Math.trunc(Math.imul(body.variance, speed) / 100);
    const strength = (speed - variance + fixedMultiply(variance, random() & 65535)) | 0;
    const angle = (baseAngle + Math.trunc(Math.imul(body.spread, (random() & 65535) - 32768) / 360)) | 0;
    const child = [...payload];
    child[8] = i;
    if (body.mode === 3 || body.mode === 4) {
      child[2] = x; child[3] = y;
      child[4] = body.vx || (body.facing >> 16); child[5] = body.vy;
    } else {
      child[2] = (x + Math.imul(nativeSin(angle), 8)) | 0;
      child[3] = (y - Math.imul(nativeCos(angle), 20)) | 0;
      child[4] = Math.imul(fixedMultiply(nativeSin(angle), strength), 24);
      child[5] = Math.imul(fixedMultiply(nativeCos(angle), strength), -24);
    }
    children.push(child);
    // A rejected child can detonate and consume RNG before the next emission.
    construct(child);
  }
  return children;
}
