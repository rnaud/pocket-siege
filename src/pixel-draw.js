// Raster primitives: integer scanlines and Bresenham steps, never Canvas paths.
export function pixelBrush(ctx) {
  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.round(x),
      Math.round(y),
      Math.max(1, Math.round(w)),
      Math.max(1, Math.round(h)),
    );
  };
  const ellipse = (cx, cy, rx, ry, color) => {
    for (let y = -Math.floor(ry); y <= ry; y++) {
      const span = Math.floor(
        rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))),
      );
      rect(cx - span, cy + y, span * 2 + 1, 1, color);
    }
  };
  const polygon = (points, color) => {
    const min = Math.ceil(Math.min(...points.map((p) => p[1]))),
      max = Math.floor(Math.max(...points.map((p) => p[1])));
    for (let y = min; y <= max; y++) {
      const cuts = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i],
          b = points[(i + 1) % points.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
          cuts.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
      cuts.sort((a, b) => a - b);
      for (let i = 0; i + 1 < cuts.length; i += 2)
        rect(
          Math.ceil(cuts[i]),
          y,
          Math.floor(cuts[i + 1]) - Math.ceil(cuts[i]) + 1,
          1,
          color,
        );
    }
  };
  return { rect, ellipse, polygon };
}
export function hash(x, y = 0) {
  let h = Math.imul(x + 191, 374761393) ^ Math.imul(y + 71, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
