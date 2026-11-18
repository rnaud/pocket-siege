// Render into the display's physical pixel grid, then enlarge by whole device
// pixels. CSS pixels alone undersample Retina displays. The final row/column
// can be clipped by the arena rather than fractionally stretched to fit.
export function pixelViewport(width, height, targetWidth = 960, pixelRatio = 1) {
  const density = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const deviceScale = Math.max(1, Math.floor(width / targetWidth));
  const scale = deviceScale / density;
  return {
    width: Math.ceil(width / scale),
    height: Math.ceil(height / scale),
    scale,
    deviceScale,
  };
}
