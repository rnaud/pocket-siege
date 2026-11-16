import { decodeImage, imageRGBA } from "./image.js";

let strip;
// 004CB380 loads stdnumw.img. Its ten digits occupy 8x11 pixels at
// y = digit * 16; the strip repeats zero at y=160.
// This adapter uses static digits; native rolling/recoloring remains unported.
export async function loadOriginalNumbers() {
  const response = await fetch(
    `${import.meta.env.BASE_URL}armageddon/media/gfx/gfx/stdnumw.img`,
  );
  if (!response.ok) throw new Error("Cannot load original number strip");
  const image = decodeImage(await response.arrayBuffer());
  strip = document.createElement("canvas");
  strip.width = image.width;
  strip.height = image.height;
  strip
    .getContext("2d")
    .putImageData(
      new ImageData(imageRGBA(image), image.width, image.height),
      0,
      0,
    );
}
export const originalNumberStrip = () => strip;
export function paintOriginalNumber(canvas, value) {
  if (!strip) return false;
  const digits = String(Math.max(0, Math.floor(value)));
  if (!/^\d+$/.test(digits)) return false;
  canvas.width = digits.length * 8;
  canvas.height = 11;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < digits.length; i++)
    ctx.drawImage(strip, 0, Number(digits[i]) * 16, 8, 11, i * 8, 0, 8, 11);
  canvas.dataset.originalSprite = "stdnumw";
  return true;
}
export function updateOriginalTimer(value, retreat = false, root = document) {
  const target = root.querySelector("#timer");
  if (!target) return;
  const label = `${value} ${retreat ? "RETREAT" : "SEC"}`;
  target.setAttribute("aria-label", label);
  if (!strip) {
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
  paintOriginalNumber(canvas, value);
  canvas.style.width = `${canvas.width * 2}px`;
  canvas.style.height = "22px";
}
