import { drawWorm } from "./worm-art.js";
import { landscape } from "./island-art.js";
import { pixelBrush } from "./pixel-draw.js";
import * as THREE from "three";

// Every mark is an integer rectangle on a native pixel grid. No image files,
// vector rasterization, smoothing, or sampled artwork enter this pipeline.
const ink = "#17343b",
  light = "#f8e6ac",
  skin = "#edbb87";
export function pixelArt(kind, team = 0, hurt = false) {
  if (kind === "landscape") return landscape();
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = c.width;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const green = team ? "#cf6855" : "#8bac57";
  const dark = team ? "#853f48" : "#49694b";
  if (kind === "soldier") {
    drawWorm(ctx, team, hurt);
  } else if (kind === "crate") {
    rect(5, 9, 23, 20, ink);
    rect(7, 11, 19, 16, "#a8774e");
    rect(8, 12, 17, 2, "#e1b570");
    rect(8, 21, 17, 2, "#6c4c3d");
    rect(10, 10, 3, 18, light);
    rect(22, 10, 3, 18, light);
    rect(15, 15, 5, 9, "#8bac57");
    rect(13, 17, 9, 5, "#8bac57");
  } else if (kind === "mine") {
    rect(4, 20, 24, 7, ink);
    rect(7, 17, 18, 7, dark);
    rect(10, 15, 12, 3, light);
    rect(14, 12, 5, 4, "#cf6855");
    rect(7, 24, 18, 1, "#8bac57");
  } else if (kind === "grenade" || kind === "sticky") {
    rect(12, 4, 8, 3, light);
    rect(14, 7, 4, 3, ink);
    rect(10, 10, 13, 18, ink);
    rect(7, 14, 19, 10, ink);
    rect(11, 11, 11, 16, kind === "sticky" ? "#cf6855" : green);
    rect(8, 15, 17, 8, kind === "sticky" ? "#cf6855" : green);
    rect(12, 13, 3, 10, light);
    rect(17, 12, 2, 14, dark);
    rect(10, 18, 13, 2, dark);
  } else {
    rect(3, 12, 24, 10, ink);
    rect(5, 14, 20, 6, kind === "mortar" ? dark : green);
    rect(7, 14, 15, 2, light);
    rect(25, 14, 4, 6, "#cf6855");
    rect(29, 16, 2, 2, "#cf6855");
    rect(3, 10, 4, 14, ink);
    rect(11, 22, 4, 6, "#a8774e");
  }
  return c;
}
export function pixelTexture(kind, team = 0, hurt = false) {
  const texture = new THREE.CanvasTexture(pixelArt(kind, team, hurt));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function mountPixelArt() {
  document.querySelectorAll("canvas[data-art]").forEach((canvas) => {
    const source = pixelArt(
      canvas.dataset.art,
      Number(canvas.dataset.team || 0),
    );
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext("2d").drawImage(source, 0, 0);
  });
}

// An integer CSS scale preserves equal-sized square pixels on every viewport.
// The last row/column can be clipped by the arena, never fractionally stretched.
export function pixelViewport(width, height) {
  const scale = Math.max(1, Math.round(width / 480));
  return {
    width: Math.ceil(width / scale),
    height: Math.ceil(height / scale),
    scale,
  };
}
