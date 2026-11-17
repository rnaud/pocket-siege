import { nativeCanvasPaletteDisplay } from "./canvas-palette.js";
import { originalVisual } from "./art.js";
import { nativeSpriteFrame } from "./animation.js";

const colors = ["r", "b", "g", "y", "p", "c"];
// 004D86F0 / 004D97F0: ID = color + (context+810 ? 0x316 : 0x310),
// progress = signed (global tick << 16) / 50. Visibility and anchoring
// are supplied by the host using the native selection placement.
export function originalSelectionFrame(color, alternate, tick) {
  const name = `${alternate ? "arrowsd" : "arrowdn"}${colors[color]}`;
  const progress = Math.trunc((tick << 16) / 50);
  return { name, index: nativeSpriteFrame(30, 1, progress) };
}
export function updateOriginalSelection(label, team, tick, visible, offset = null) {
  let canvas = label.querySelector(".original-selection");
  if (!visible) {
    if (canvas) canvas.hidden = true;
    return;
  }
  // Host Moss/Coral teams map to the original green/red palettes.
  const { name, index } = originalSelectionFrame(team ? 0 : 2, false, tick);
  const frame = originalVisual(name, index);
  if (!frame) return;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "original-selection";
    canvas.setAttribute("aria-hidden", "true");
    canvas.width = frame.width;
    canvas.height = frame.height;
    label.append(canvas);
    label.classList.add("has-original-selection");
  }
  canvas.hidden = false;
  if (offset) {
    canvas.style.left = `${Math.round(offset.x - frame.width / 2)}px`;
    canvas.style.top = `${Math.round(offset.y - frame.height / 2)}px`;
  }
  if (canvas.dataset.originalSprite === name && +canvas.dataset.frame === index)
    return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame.map.image, 0, 0);
  nativeCanvasPaletteDisplay.capture(canvas);
  canvas.dataset.originalSprite = name;
  canvas.dataset.frame = index;
}
