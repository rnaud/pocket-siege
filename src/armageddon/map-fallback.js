import { nativeCirclePixels } from "./crater-mask.js";

const pixel = (image, x, y) =>
  x < 0 || y < 0 || x >= image.width || y >= image.height
    ? 0
    : image.pixels[y * image.width + x];
const put = (image, x, y, value) => {
  if (x >= 0 && y >= 0 && x < image.width && y < image.height)
    image.pixels[y * image.width + x] = value;
};

// LANDGEN 00409790 constructs a radius-50 hole and a radius-55 rim.
export function nativeMapFallbackMasks() {
  const hole = { width: 111, height: 111, pixels: new Uint8Array(111 * 111) };
  const rim = { ...hole, pixels: hole.pixels.slice() };
  nativeCirclePixels(50, (x, y, value) => put(hole, x + 55, y + 55, value));
  nativeCirclePixels(55, (x, y, value) => put(rim, x + 55, y + 55, value));
  nativeCirclePixels(50, (x, y, value) => put(rim, x + 55, y + 55, value), 0);
  return { hole, rim };
}

// 00409410. Preserve layer aliasing and operation order: color is cleared
// only where the collision layer was occupied; collision/backing always clear.
export function nativeCarveMapCandidate(layers, hole, rim, x, y, rimColor) {
  for (let sy = 0; sy < hole.height; sy++)
    for (let sx = 0; sx < hole.width; sx++) {
      if (!pixel(hole, sx, sy)) continue;
      const px = x + sx,
        py = y + sy;
      if (pixel(layers.solid, px, py)) put(layers.color, px, py, 0);
      put(layers.solid, px, py, 0);
      put(layers.back, px, py, 0);
    }
  if (rim)
    for (let sy = 0; sy < hole.height; sy++)
      for (let sx = 0; sx < hole.width; sx++)
        if (pixel(rim, sx, sy) && pixel(layers.solid, x + sx, y + sy))
          put(layers.color, x + sx, y + sy, rimColor);
}

// 00409560. The native retry condition uses the number of points inspected,
// not an attempt counter. In a fully obstructed region this can fail to terminate;
// preserve that behavior here rather than silently choosing a different point.
export function nativeMapFallback(layers, existing, settings, random) {
  const { distance, limit, water, hole, rim, platform, rimColor } = settings;
  let { x, y } = settings;
  const half = Math.trunc(distance / 2);
  const rangeX = (layers.solid.width - distance) >>> 0;
  const rangeY =
    (Math.trunc(Math.imul(100 - water, layers.solid.height) / 100) -
      distance) >>>
    0;
  if (limit <= 0) return { found: false, x, y };
  do {
    x = ((random() & 65535) % rangeX) + half;
    y = ((random() & 65535) % rangeY) + half;
    let blocked = false,
      inspected = 0;
    for (; inspected < existing.length; inspected++) {
      if (blocked) break;
      const dx = (x - existing[inspected].x) | 0,
        dy = (y - existing[inspected].y) | 0;
      if (
        ((Math.imul(dx, dx) + Math.imul(dy, dy)) | 0) <
        Math.imul(distance, distance)
      )
        blocked = true;
    }
    if (blocked) {
      if (inspected + 1 < limit) continue;
      return { found: false, x, y };
    }
    nativeCarveMapCandidate(
      layers,
      hole,
      rim,
      x - Math.trunc(hole.width / 2),
      y - Math.trunc(hole.height / 2),
      rimColor,
    );
    const left = x - Math.trunc(platform.width / 2),
      top = y - Math.trunc(platform.height / 2) + 24;
    for (const image of [layers.solid, layers.color])
      for (let sy = 0; sy < platform.height; sy++)
        for (let sx = 0; sx < platform.width; sx++) {
          const value = pixel(platform, sx, sy);
          if (value) put(image, left + sx, top + sy, value);
        }
    return { found: true, x, y };
  } while (true);
}
