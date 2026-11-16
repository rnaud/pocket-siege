// 004D7F77..004D7FD6. Common body transition/finalizer live in worm-state.js.
export function nativeHurtEntry(state, angle = 0) {
  const sprite = { 0x7f: 0x230, 0x80: 0x12, 0x81: 0x0d }[state];
  if (!sprite) return null;
  return {
    angle: state === 0x80 ? 0 : angle >>> 0,
    calls: [
      { operation: "clear" },
      { operation: "queue", sprite_id: sprite, progress: 0 },
    ],
  };
}
