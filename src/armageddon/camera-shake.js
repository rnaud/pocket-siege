import { fixedMultiply } from "./numeric.js";
import { nativeSin, nativeCos } from "./trig.js";

// 004A2DA9..004A2E2F. Native camera coordinates are signed16.16/Y-down.
export function nativeCameraShake(camera, frame, amplitudes) {
  const angle = Math.trunc(Math.imul(frame, 0x70000) / 50);
  return [
    (camera[0] + fixedMultiply(nativeCos(angle), amplitudes[0])) | 0,
    (camera[1] + fixedMultiply(nativeSin(angle), amplitudes[1])) | 0,
    camera[2],
  ];
}

// 004EB110 calls004EDA70 before the nuclear controller overwrites amplitude.
export function nativeCameraShakeDecay(value) {
  const delta = -value | 0;
  const absolute = n => ((n ^ (n >> 31)) - (n >> 31)) | 0;
  const step = Math.max(0x7ae, absolute(fixedMultiply(delta, 0x1999)));
  return step < absolute(delta) ? (value + (value <= 0 ? step : -step)) | 0 : 0;
}
