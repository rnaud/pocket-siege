import { nativeChargeBlobs } from "./charge-art.js";
import { nativeSpriteFrame } from "./animation.js";
import { originalVisual } from "./art.js";
// The original request arithmetic is preserved; origin and sight vector are
// supplied in host screen pixels until native aiming geometry is integrated.
export function updateOriginalCharge(
  canvas,
  power,
  origin,
  target,
  width,
  height,
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
  const requests = nativeChargeBlobs(
    power,
    Math.round(origin.x * 65536),
    Math.round(origin.y * 65536),
    Math.round((target.x - origin.x) * 65536),
    Math.round((target.y - origin.y) * 65536),
  );
  for (const request of requests) {
    const frame = originalVisual(
      "blob",
      nativeSpriteFrame(16, 1, request.progress),
    );
    if (!frame) continue;
    ctx.drawImage(
      frame.map.image,
      (request.x >> 16) - 32,
      (request.y >> 16) - 32,
    );
  }
  canvas.dataset.blobCount = requests.length;
  if (originalVisual("blob")) canvas.dataset.originalSprite = "blob";
}
