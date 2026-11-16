// 004D97F0 event 0x433; logic RNG 004EE960. Audio handles remain host-owned.
export function nativeHitVoice(frame, previousFrame, nextRandom) {
  if (((frame - previousFrame) | 0) <= 24) return null;
  return { index: 0x26 + ((nextRandom() & 255) % 3), frame: frame >>> 0 };
}
