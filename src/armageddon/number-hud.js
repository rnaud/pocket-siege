import { nativeHUDFrame, paintNativeFrameRequests } from "./hud-frame.js";
import { fixedMultiply } from "./numeric.js";
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

// 004B56A0: clock uses the outer native frame, with a solid black interior.
export function nativeClockFrame(width, height, black, teamColor) {
  const calls = nativeHUDFrame(width, height, black, black, teamColor);
  return [...calls.slice(0, 9), ...calls.slice(-4)];
}
// 004B64B0 clock visibility block. Unlike team bars, snap threshold is 0xCCC.
export function nativeClockSlide(progress, target) {
  const difference = (target - progress) | 0;
  const sign = difference >> 31;
  if (((difference ^ sign) - sign | 0) < 0xccc) return target;
  return (progress + (progress < target ? 0xccc : -0xccc)) | 0;
}
export function updateOriginalClockPanel(progress, team, root = document) {
  const panel = root.querySelector(".turn");
  if (!panel) return;
  let frame = panel.querySelector(".native-clock-frame");
  if (!frame) {
    frame = document.createElement("canvas");
    frame.className = "native-clock-frame";
    frame.setAttribute("aria-hidden", "true");
    panel.prepend(frame);
  }
  if (frame.dataset.team !== String(team)) {
    paintNativeFrameRequests(frame, 56, 42, nativeClockFrame(56, 42, "#000000", team ? "#ff8080" : "#80ff80"));
    frame.dataset.team = String(team);
  }
  // 004B5860: center (38, screenHeight - 60 * progress + 30).
  panel.style.bottom = `${Math.round(fixedMultiply(60 << 16, progress) / 65536) - 51}px`;
}
