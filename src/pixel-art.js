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
    const { polygon: poly } = pixelBrush(ctx);
    const outline = "#433244";
    const body = team ? "#ed9987" : "#b5bc75";
    const shade = team ? "#be7079" : "#818a53";
    const highlight = team ? "#ffd0a6" : "#e3d99a";
    const face = team ? "#f6af92" : "#d3ca8d";
    // One soft head, a short neck and a low tapered tail. No raised tail loop
    // or separate rectangular face panel: the silhouette is a single worm.
    poly(
      [
        [12, 4],
        [22, 4],
        [26, 7],
        [27, 13],
        [25, 17],
        [24, 19],
        [24, 23],
        [25, 25],
        [24, 28],
        [20, 30],
        [10, 30],
        [5, 28],
        [2, 25],
        [3, 23],
        [5, 24],
        [8, 26],
        [12, 26],
        [13, 23],
        [12, 19],
        [11, 17],
        [9, 13],
        [9, 8],
      ],
      outline,
    );
    poly(
      [
        [13, 5],
        [21, 5],
        [25, 8],
        [26, 12],
        [24, 16],
        [23, 18],
        [23, 22],
        [24, 25],
        [23, 27],
        [19, 29],
        [10, 29],
        [6, 27],
        [4, 25],
        [8, 27],
        [13, 27],
        [15, 24],
        [14, 19],
        [12, 16],
        [10, 12],
        [10, 9],
      ],
      body,
    );
    poly(
      [
        [13, 6],
        [21, 6],
        [24, 8],
        [25, 12],
        [23, 16],
        [19, 17],
        [13, 15],
        [11, 12],
        [11, 9],
      ],
      face,
    );
    poly(
      [
        [20, 19],
        [23, 18],
        [23, 23],
        [24, 25],
        [22, 28],
        [18, 29],
        [10, 29],
        [7, 27],
        [13, 28],
        [18, 26],
        [21, 23],
      ],
      shade,
    );
    rect(13, 5, 7, 1, highlight);
    rect(11, 7, 2, 2, highlight);
    rect(13, 19, 2, 4, highlight);
    rect(10, 27, 4, 1, highlight);
    // Compact round eyes, with one-pixel pupils looking toward the muzzle.
    const eye = (x, y, closed = false) => {
      if (closed) {
        rect(x, y + 2, 4, 1, outline);
        return;
      }
      rect(x + 1, y, 3, 1, "#fff0c8");
      rect(x, y + 1, 5, 3, "#fff0c8");
      rect(x + 1, y + 4, 3, 1, "#fff0c8");
      rect(x + 3, y + 1, 1, 2, outline);
    };
    eye(13, 9, hurt === true || hurt === "blink" || hurt === "recoil");
    eye(20, 8, hurt === "blink" || hurt === "recoil");
    if (hurt === "aim") rect(13, 9, 5, 1, outline);
    // Smile sits below the eyes instead of a long vertical mouth.
    rect(19, 16, 4, 1, outline);
    rect(18, 15, 1, 1, outline);
    if (hurt === true || hurt === "recoil") {
      rect(18, 15, 6, 2, outline);
      rect(19, 15, 4, 1, "#fff0c8");
    }
    if (hurt === "panic") {
      rect(18, 15, 5, 4, outline);
      rect(19, 16, 3, 1, "#fff0c8");
      rect(12, 7, 4, 1, outline);
      rect(21, 6, 3, 1, outline);
    }
    if (hurt === "victory") {
      rect(17, 15, 7, 3, outline);
      rect(18, 15, 5, 1, "#fff0c8");
      rect(8, 18, 4, 2, outline);
      rect(7, 15, 3, 4, outline);
      rect(7, 14, 3, 3, highlight);
      rect(9, 18, 2, 1, body);
    }
    if (hurt === "walk") {
      rect(4, 26, 4, 2, body);
      rect(7, 28, 6, 1, shade);
      rect(14, 25, 3, 2, highlight);
    }
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
