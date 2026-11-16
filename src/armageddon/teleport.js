// 004F8030, signed progress arithmetic and state boundaries.
export function nativeTeleportTick(previous) {
  const progress = (previous + 0x28f) | 0;
  return {
    progress,
    relocate: previous <= 0x8000 && progress > 0x8000,
    target: progress >= 0x10000 ? 0x65 : null,
  };
}
