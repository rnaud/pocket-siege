import { nativeCameraShakeDecay } from "./camera-shake.js";
// Full004D2F90. Palette8/9 and image1/2 identify original resource slots.
export function nativeWindMeter({ wind, phase, visibility, width = 181,
  height = 17, viewportWidth, viewportHeight }) {
  const center = Math.trunc(width / 2);
  const strength = Math.max(-65536, Math.min(65536, Math.imul(wind, 3)));
  const edge = (Math.trunc((Math.imul(width - 4, strength) >> 16) / 2) + center) | 0;
  const offset = ((phase & 0xe000) << 3) >> 16;
  const calls = [
    { operation: 'rectangle', args: [2, 2, width - 2, height - 2, 8] },
    { operation: 'line', args: [center, 0, height, 9] },
  ];
  if (edge < center - 1) calls.push(
    { operation: 'strip', args: [edge, 2, center - edge - 1, 13, 1, offset, 0, 0] },
    { operation: 'pixel', args: [edge, 2, 8] },
    { operation: 'pixel', args: [edge, 15, 8] });
  if (edge > center + 2) calls.push(
    { operation: 'strip', args: [center + 2, 2, edge - center - 1, 13, 2, offset ^ 7, 0, 0] },
    { operation: 'pixel', args: [edge, 2, 8] },
    { operation: 'pixel', args: [edge, 14, 8] });
  const x = Math.trunc(((viewportWidth - width - 18) << 16) / 2) | 0;
  const y = (Math.trunc(((viewportHeight - height - 6) << 16) / 2) +
    ((65536 - visibility) << 5)) | 0;
  calls.push({ operation: 'draw', args: [16, x, y, 0, 0, 0, width, height, 0] });
  return calls;
}

// 004D2B60 event3EA: displayed wind approaches the43C target by327 units.
export function nativeWindMeterTick(current, target) {
  const delta = (target - current) | 0, sign = delta >> 31;
  if ((((delta ^ sign) - sign) | 0) < 0x147) return target;
  return (current + (current < target ? 0x147 : -0x147)) | 0;
}

// 004D2B60 event3ED: texture scrolling uses the smoothed wind magnitude.
export function nativeWindMeterPhase(phase, wind) {
  const sign = wind >> 31;
  const magnitude = ((wind ^ sign) - sign) | 0;
  return (phase + Math.trunc(magnitude / 3) + 0x51e) | 0;
}

// Same004EDA70 approach helper as camera decay, translated to the HUD target.
export function nativeWindMeterVisibility(current, hidden = false) {
  const target = hidden ? 0 : 65536;
  return (target + nativeCameraShakeDecay((current - target) | 0)) | 0;
}
