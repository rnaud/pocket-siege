// An integer CSS scale preserves equal-sized square pixels on every viewport.
// The last row/column can be clipped by the arena, never fractionally stretched.
export function pixelViewport(width, height, targetWidth = 960) {
  const scale = Math.max(1, Math.floor(width / targetWidth));
  return {
    width: Math.ceil(width / scale),
    height: Math.ceil(height / scale),
    scale,
  };
}
