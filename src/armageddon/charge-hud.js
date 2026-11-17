import { nativeCanvasPaletteDisplay } from "./canvas-palette.js";
import { nativeChargeBlobs } from "./charge-art.js";
import { nativeSpriteFrame } from "./animation.js";
import { originalVisual } from "./art.js";
// Live callers supply native world geometry and project only the final integer
// draw positions. Screen-coordinate inputs remain available to isolated callers.
export function updateOriginalCharge(
  canvas,
  power,
  origin,
  target,
  width,
  height,
  native = null,
) {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    const holder = canvas.parentElement;
    holder.setAttribute("width", width);
    holder.setAttribute("height", height);
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
  const geometry = native?.geometry ?? {
    x: Math.round(origin.x * 65536),
    y: Math.round(origin.y * 65536),
    dx: Math.round((target.x - origin.x) * 65536),
    dy: Math.round((target.y - origin.y) * 65536),
  };
  const requests = nativeChargeBlobs(
    power,
    geometry.x,
    geometry.y,
    geometry.dx,
    geometry.dy,
  );
  let left = width, top = height, right = 0, bottom = 0;
  for (const request of requests) {
    const frame = originalVisual(
      "blob",
      nativeSpriteFrame(16, 1, request.progress),
    );
    if (!frame) continue;
    const point = native
      ? native.project(request.x, request.y)
      : { x: request.x >> 16, y: request.y >> 16 };
    const x = Math.round(point.x) - 32, y = Math.round(point.y) - 32;
    ctx.drawImage(frame.map.image, x, y);
    left = Math.min(left, Math.max(0, x));
    top = Math.min(top, Math.max(0, y));
    right = Math.max(right, Math.min(width, x + frame.map.image.width));
    bottom = Math.max(bottom, Math.min(height, y + frame.map.image.height));
  }
  nativeCanvasPaletteDisplay.capture(canvas, 1, [left, top, Math.max(0, right - left), Math.max(0, bottom - top)]);
  canvas.dataset.blobCount = requests.length;
  if (originalVisual("blob")) canvas.dataset.originalSprite = "blob";
}
