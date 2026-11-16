// 004D7730, dispatch at 004D79C0..004D7A09. The constructor's type2
// is replaced on state entry; it is not a permanent worm category.
export function nativeWormCollisionType(state) {
  state |= 0;
  if (state === 0x88) return 6;
  if (state === 0x78 || state === 0x79) return 4;
  if (state === 0x73 || state === 0x7b || state === 0x7c) return 5;
  if (
    (state >= 0x68 && state <= 0x72) ||
    (state >= 0x74 && state <= 0x76) ||
    (state >= 0x7e && state <= 0x85) ||
    state === 0x87
  ) return 3;
  return 2;
}

// Resolve the host's currently represented native states. Other traversal
// controllers still need their complete native state-entry adapters.
export function nativeWormState(worm) {
  if (worm.frozen) return 0x88;
  if (worm.originalFirePunch) return 0x6c;
  if (worm.originalAxe) return 0x72;
  return worm.nativeHurtBody?.state ?? worm.nativeFlight?.state ??
    worm.originalHurt?.state ?? (worm.originalRecovery ? 0x76 :
    worm.originalParachute ? 0x7d : worm.originalJump ? 0x79 : 0x65);
}
