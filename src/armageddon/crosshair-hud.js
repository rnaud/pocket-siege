import { originalVisual } from "./art.js";
import { nativeSpriteFrame } from "./animation.js";

// Static trace 004FB970: team palette + 0x304, controlled progress
// aim + (0x10100 - opening) * 2. Native easing supplies live progress;
// full native aiming geometry/state dispatch remains unported.
export function originalCrosshairFrame(color, aim, opening = 0x10000) {
  const name = `crshair${["r", "b", "g", "y", "p", "c"][color]}`;
  const progress = (aim + Math.imul((0x10100 - opening) | 0, 2)) | 0;
  return { name, index: nativeSpriteFrame(32, 1, progress) };
}
export function updateOriginalCrosshair(canvas, team, angle, sight = null) {
  const pitch = Math.asin(Math.sin((angle * Math.PI) / 180));
  const aim = Math.round((pitch / Math.PI + 0.5) * 0xffff);
  const { name, index } = originalCrosshairFrame(
    team ? 0 : 2,
    sight?.aim ?? aim,
    sight?.opening ?? 0x10000,
  );
  const frame = originalVisual(name, index);
  if (!frame) return;
  const flipped = Math.cos((angle * Math.PI) / 180) >= 0;
  const key = `${name}:${index}:${flipped}`;
  if (canvas.dataset.frameKey === key) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 60, 60);
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (flipped) {
    ctx.translate(60, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(frame.map.image, 0, 0);
  ctx.restore();
  canvas.dataset.frameKey = key;
  canvas.dataset.originalSprite = name;
  canvas.dataset.frame = index;
}
