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
export function updateOriginalWindHUD(wind, root = document) {
  const target = root.querySelector("#wind");
  if (!target) return;
  const label = `WIND ${wind < 0 ? "←" : "→"} ${Math.abs(wind / 5).toFixed(1)}`;
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
    canvas.width = 193;
    canvas.height = 13;
    canvas.setAttribute("aria-hidden", "true");
    target.replaceChildren(text, canvas);
    target.classList.add("original-wind");
  }
  target.querySelector(".wind-value").textContent = label;
  target.setAttribute("aria-label", label);
  // Existing host storm range is +/-26. Crop native pixels, never stretch.
  const count = Math.min(96, Math.round((Math.abs(wind) / 26) * 96));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 193, 13);
  ctx.imageSmoothingEnabled = false;
  if (count) {
    const sx = wind < 0 ? 96 - count : 0;
    ctx.drawImage(
      source,
      sx,
      0,
      count,
      13,
      wind < 0 ? 96 - count : 97,
      0,
      count,
      13,
    );
  }
  canvas.dataset.originalSprite = wind < 0 ? "windl" : "windr";
  canvas.dataset.filledPixels = count;
}
