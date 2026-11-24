import { teamColor } from "../teams.js";
import { nativeCanvasPaletteDisplay } from "./canvas-palette.js";
import { originalVisual } from "./art.js";
import { nativeSpriteFrame } from "./animation.js";
// 004E6190 draws palette + 0x322 at the selected world coordinate.
// Team event 0x3ED in 004E6810 increments progress by 0xCCC.
export function originalTargetFrame(color, tick) {
  return {
    name: `marker${["r", "b", "g", "y", "p", "c"][color]}`,
    index: nativeSpriteFrame(10, 3, Math.imul(tick, 0xccc)),
  };
}
export function updateOriginalTarget(canvas, team, tick) {
  const { name, index } = originalTargetFrame(teamColor(team), tick);
  const frame = originalVisual(name, index);
  if (!frame) return false;
  if (canvas.width !== 60 || canvas.height !== 60)
    canvas.width = canvas.height = 60;
  if (canvas.dataset.originalSprite === name && +canvas.dataset.frame === index)
    return true;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 60, 60);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame.map.image, 0, 0);
  nativeCanvasPaletteDisplay.capture(canvas);
  canvas.dataset.originalSprite = name;
  canvas.dataset.frame = index;
  return true;
}
