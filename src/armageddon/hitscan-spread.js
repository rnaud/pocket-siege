import { nativeSin, nativeCos } from "./trig.js";
import { fixedMultiply } from "./numeric.js";
// 004FC210 copies eleven words and rotates the direction for each ray.
// A zero spread still consumes one logic RNG draw per ray.
export function nativeHitscanRays(shot, count, spread, random) {
  const rays = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.trunc(
      Math.imul(spread, (random() & 0xffff) - 0x8000) / 360,
    );
    const sin = nativeSin(angle),
      cos = nativeCos(angle),
      ray = [...shot];
    ray[4] = (fixedMultiply(sin, shot[5]) + fixedMultiply(cos, shot[4])) | 0;
    ray[5] = (fixedMultiply(cos, shot[5]) + fixedMultiply(-sin, shot[4])) | 0;
    rays.push(ray);
  }
  return rays;
}
