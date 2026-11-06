import { W, H } from "./physics.js";

export const FULL_VIEW = { x: 0, y: 0, w: W, h: H, zoom: 1 };

// Fit the action and the active worm together. Zooming in on the projectile
// alone pushes the shooter off-screen on long shots.
export function chooseCameraTarget({ phase, projectile, worms, active }) {
  if (phase !== "flight" && phase !== "settle")
    return { zoom: 1, cx: W / 2, cy: H / 2 };
  let focus = projectile;
  if (!focus) {
    let fastest = null;
    for (const w of worms) {
      if (!w.knocked) continue;
      const speed = Math.hypot(w.vx, w.vy);
      if (speed < 90) continue;
      if (!fastest || speed > fastest.speed) fastest = { w, speed };
    }
    if (!fastest) return { zoom: 1, cx: W / 2, cy: H / 2 };
    focus = { x: fastest.w.x, y: fastest.w.y + 20 };
  }
  const ax = active?.x ?? focus.x,
    ay = (active?.y ?? focus.y) + 20;
  const cx = (focus.x + ax) / 2,
    cy = (focus.y + ay) / 2;
  const spanX = Math.abs(focus.x - ax) + 360,
    spanY = Math.abs(focus.y - ay) + 280;
  const zoom = Math.min(1.35, Math.max(1, Math.min(W / spanX, H / spanY)));
  return { zoom, cx, cy };
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function cameraView(cx, cy, zoom) {
  const z = clamp(zoom, 1, 1.5),
    w = W / z,
    h = H / z;
  return {
    x: clamp(cx - w / 2, 0, W - w),
    y: clamp(cy - h / 2, 0, H - h),
    w,
    h,
    zoom: z,
  };
}
