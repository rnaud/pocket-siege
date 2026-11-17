import { nativeWindMeter, nativeWindMeterTick, nativeWindMeterPhase, nativeWindMeterVisibility } from "./wind-meter.js";
import { nativeCanvasPaletteDisplay } from "./canvas-palette.js";
import { decodeImage, imageRGBA } from "./image.js";
const strips = new Map();
// 004CB380 loads windl.img and windr.img as the original wind meter strips.
export async function loadOriginalWindHUD() {
  await Promise.all(
    ["windl", "windr"].map(async (name) => {
      const response = await fetch(
        `${import.meta.env.BASE_URL}armageddon/media/gfx/gfx/${name}.img`,
      );
      if (!response.ok) throw new Error(`Cannot load ${name}`);
      const image = decodeImage(await response.arrayBuffer());
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      canvas
        .getContext("2d")
        .putImageData(
          new ImageData(imageRGBA(image), image.width, image.height),
          0,
          0,
        );
      strips.set(name, canvas);
    }),
  );
}
export const originalWindStrip = (name) => strips.get(name);
let displayedWind = 0, phase = 0, visibility = 0;
export function resetOriginalWindHUD() { displayedWind = 0; phase = 0; visibility = 0; }
// 3EA changes simulation wind; 3ED keeps presenting during native replay.
export function tickOriginalWindHUD(wind, advance = true) {
  if (advance)
    displayedWind = nativeWindMeterTick(displayedWind, Math.round(wind / 2500 * 65536) | 0);
  else renderOriginalWindHUD();
}
export function tickOriginalWindPresentation(replaying = false) {
  phase = nativeWindMeterPhase(phase, displayedWind);
  visibility = nativeWindMeterVisibility(visibility, replaying);
  renderOriginalWindHUD();
}
function renderOriginalWindHUD() {
  updateOriginalWindHUD(displayedWind / 65536 * 2500, document, phase);
  const target = document.querySelector("#wind");
  if (target) target.style.transform = `translateY(${Math.trunc((65536 - visibility) * 32 / 65536)}px)`;
}
export function updateOriginalWindHUD(wind, root = document, phase = 0) {
  const target = root.querySelector("#wind");
  if (!target) return;
  const label = `WIND ${wind < 0 ? "←" : "→"} ${Math.abs(wind / 2500 * 35).toFixed(1)}`;
  const source = strips.get(wind < 0 ? "windl" : "windr");
  if (!source) {
    target.textContent = label;
    return;
  }
  let canvas = target.querySelector("canvas");
  if (!canvas) {
    const text = document.createElement("span");
    text.className = "wind-value";
    canvas = document.createElement("canvas");
    canvas.width = 181;
    canvas.height = 17;
    canvas.setAttribute("aria-hidden", "true");
    target.replaceChildren(text, canvas);
    target.classList.add("original-wind");
  }
  target.querySelector(".wind-value").textContent = label;
  target.setAttribute("aria-label", label);
  const calls = nativeWindMeter({ wind: Math.round(wind / 2500 * 65536) | 0,
    phase, visibility: 65536, viewportWidth: 640, viewportHeight: 480 });
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 181, 17);
  ctx.imageSmoothingEnabled = false;
  let count = 0;
  for (const { operation, args } of calls) {
    const [x, y, a, b] = args;
    if (operation === "rectangle") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(x, y, a - x, b - y);
    } else if (operation === "line") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, 1, a - y);
    } else if (operation === "pixel") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(x, y, 1, 1);
    } else if (operation === "strip") {
      count = a;
      ctx.drawImage(strips.get(args[4] === 1 ? "windl" : "windr"),
        args[5], args[6], a, b, x, y, a, b);
    }
  }
  nativeCanvasPaletteDisplay.capture(canvas);
  canvas.dataset.originalSprite = wind < 0 ? "windl" : "windr";
  canvas.dataset.filledPixels = count;
}
