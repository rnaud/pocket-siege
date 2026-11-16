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
