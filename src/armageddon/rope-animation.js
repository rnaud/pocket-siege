// 004F8720: original 64-direction rope pose uses body angle and facing.
export function nativeRopeAnimation(facing, angle, field104 = 1, field108 = 0) {
  return {
    progress: (-Math.imul(facing, angle) & 0xffff) - 0xbe00,
    friction: 0x3ae1,
    target: !field104 || field108 ? 0x65 : null,
  };
}
