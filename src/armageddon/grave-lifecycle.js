// 004D5717–004D57C0. Native coordinates are downward-positive 16.16.
export function nativeGraveLifecycle(progress, phase, wet, y, depth) {
  if (y >> 16 >= depth) return { alive: false, progress, phase, bubbles: 0 };
  progress = (progress + 0x51e) | 0;
  let bubbles = 0;
  if (wet) {
    phase = (phase + 0x4000) | 0;
    while (phase >= 0x10000) {
      phase = (phase - 0x10000) | 0;
      bubbles++;
    }
  }
  return { alive: true, progress, phase, bubbles };
}
