// 004F8030, signed progress arithmetic and state boundaries.
export function nativeTeleportTick(previous) {
  const progress = (previous + 0x28f) | 0;
  return {
    progress,
    relocate: previous <= 0x8000 && progress > 0x8000,
    target: progress >= 0x10000 ? 0x65 : null,
  };
}

// 004DB816–004DB83F: dissolve outward, then reverse to rematerialize.
export function nativeTeleportRenderProgress(progress) {
  return (progress < 0x8000 ? progress * 2 : (0x10000 - progress) * 2) | 0;
}
