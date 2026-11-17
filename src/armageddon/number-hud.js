import { loadNativeFont, paintNativeText } from "./font.js";

const fontNames = ["lnumred1", "lnumwht1", "lnumred2", "lnumwht2"];
let fonts;
// 004A6B10 registers IDs 24..27; 004B5860 selects the turn-clock font.
export async function loadOriginalNumbers() {
  fonts = await Promise.all(fontNames.map(loadNativeFont));
}
export function nativeTimerFont(milliseconds, running) {
  milliseconds |= 0;
  if (milliseconds === 0) return 24;
  const warning = milliseconds <= 5000 && (Math.trunc(milliseconds / 250) & 1);
  return (running ? 25 : 27) - Number(Boolean(warning));
}
export function paintOriginalNumber(canvas, value, font = 25) {
  if (!fonts) return false;
  const digits = String(Math.max(0, Math.floor(value)));
  if (!/^\d+$/.test(digits) || font < 24 || font > 27) return false;
  const key = `${digits}:${font}`;
  if (canvas.dataset.nativeNumber !== key) {
    paintNativeText(canvas, fonts[font - 24], digits, 1);
    canvas.dataset.nativeNumber = key;
    canvas.dataset.nativeFont = fontNames[font - 24];
  }
  return true;
}
export function updateOriginalTimer(value, retreat = false, root = document, milliseconds = value * 1000, running = !retreat) {
  const target = root.querySelector("#timer");
  if (!target) return;
  const label = `${value} ${retreat ? "RETREAT" : "SEC"}`;
  target.setAttribute("aria-label", label);
  if (!fonts) {
    target.textContent = label;
    return;
  }
  let canvas = target.querySelector("canvas");
  if (!canvas) {
    const text = document.createElement("span");
    text.className = "original-timer-text";
    canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    target.replaceChildren(text, canvas);
    target.classList.add("original-timer");
  }
  target.querySelector(".original-timer-text").textContent = label;
  paintOriginalNumber(canvas, value, nativeTimerFont(milliseconds, running));
}
