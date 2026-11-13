import { W, H, WATER } from "./physics.js";
import { pixelBrush, hash } from "./pixel-draw.js";

// Designed rock shards, not a tessellation. Unequal widths, broken facets and
// diagonal seams reproduce the cliff structure of the art-direction reference.
const SHARDS = [
  [
    [3, 173],
    [23, 151],
    [42, 139],
    [35, 171],
    [16, 204],
    [0, 214],
  ],
  [
    [12, 228],
    [27, 185],
    [48, 160],
    [64, 151],
    [57, 180],
    [43, 216],
    [31, 242],
  ],
  [
    [37, 179],
    [52, 147],
    [64, 137],
    [74, 155],
    [64, 184],
    [50, 204],
  ],
  [
    [43, 227],
    [62, 194],
    [72, 177],
    [86, 183],
    [89, 210],
    [70, 231],
    [57, 248],
  ],
  [
    [76, 167],
    [89, 160],
    [111, 161],
    [102, 182],
    [92, 194],
    [80, 188],
  ],
  [
    [93, 211],
    [105, 184],
    [121, 168],
    [136, 183],
    [129, 211],
    [111, 239],
  ],
  [
    [122, 246],
    [137, 216],
    [147, 194],
    [164, 197],
    [167, 222],
    [150, 248],
  ],
  [
    [157, 244],
    [176, 209],
    [188, 196],
    [205, 199],
    [197, 225],
    [183, 250],
  ],
  [
    [190, 232],
    [206, 204],
    [221, 184],
    [239, 190],
    [232, 211],
    [216, 240],
  ],
  [
    [213, 184],
    [230, 164],
    [250, 157],
    [257, 170],
    [242, 190],
    [227, 207],
  ],
  [
    [239, 244],
    [255, 212],
    [265, 179],
    [280, 167],
    [288, 184],
    [277, 210],
    [264, 244],
  ],
  [
    [267, 165],
    [285, 155],
    [298, 159],
    [307, 178],
    [298, 196],
    [281, 189],
  ],
  [
    [302, 194],
    [313, 165],
    [327, 148],
    [341, 151],
    [341, 179],
    [322, 212],
  ],
  [
    [331, 226],
    [344, 194],
    [357, 169],
    [371, 154],
    [386, 158],
    [374, 191],
    [359, 225],
  ],
  [
    [352, 149],
    [372, 143],
    [393, 137],
    [406, 150],
    [397, 169],
    [374, 183],
  ],
  [
    [383, 213],
    [404, 179],
    [419, 155],
    [430, 147],
    [440, 163],
    [429, 190],
    [411, 224],
  ],
  [
    [418, 145],
    [431, 132],
    [454, 129],
    [467, 143],
    [456, 161],
    [436, 172],
  ],
  [
    [432, 224],
    [445, 193],
    [464, 175],
    [477, 184],
    [470, 214],
    [452, 242],
  ],
  [
    [6, 245],
    [15, 228],
    [32, 223],
    [45, 231],
    [43, 249],
  ],
  [
    [78, 248],
    [85, 231],
    [99, 224],
    [114, 236],
    [114, 252],
  ],
  [
    [280, 248],
    [280, 233],
    [292, 219],
    [301, 234],
    [300, 251],
  ],
  [
    [310, 251],
    [316, 231],
    [331, 220],
    [347, 230],
    [348, 252],
  ],
  [
    [366, 252],
    [373, 230],
    [390, 218],
    [402, 228],
    [401, 251],
  ],
];
let cliffArt;
function cliffs() {
  if (cliffArt) return cliffArt;
  const c = document.createElement("canvas");
  c.width = 480;
  c.height = 270;
  const b = pixelBrush(c.getContext("2d"));
  b.rect(0, 0, 480, 270, "#895361");
  SHARDS.forEach((points, i) => {
    const warm = i % 4 !== 2;
    const centerX = points.reduce((n, p) => n + p[0], 0) / points.length;
    const centerY = points.reduce((n, p) => n + p[1], 0) / points.length;
    b.polygon(
      points.map(([x, y]) => [
        centerX + (x - centerX) * 1.09,
        centerY + (y - centerY) * 1.05,
      ]),
      "#59394f",
    );
    b.polygon(points, warm ? "#aa5e63" : "#89556b");
    const xs = points.map((p) => p[0]),
      ys = points.map((p) => p[1]);
    const x = Math.min(...xs),
      y = Math.min(...ys),
      w = Math.max(...xs) - x,
      h = Math.max(...ys) - y;
    // Convex lit face, long cool side, and a short bright upper bevel.
    const face = [
      [x + w * 0.2, y + h * 0.32],
      [x + w * 0.62, y + h * 0.05],
      [x + w * 0.94, y + h * 0.2],
      [x + w * 0.62, y + h * 0.59],
      [x + w * 0.27, y + h * 0.9],
      [x + w * 0.08, y + h * 0.61],
    ];
    b.polygon(face, warm ? "#e27e60" : "#ad6468");
    b.polygon(
      [
        [x + w * 0.2, y + h * 0.32],
        [x + w * 0.62, y + h * 0.05],
        [x + w * 0.94, y + h * 0.2],
        [x + w * 0.84, y + h * 0.24],
        [x + w * 0.61, y + h * 0.13],
        [x + w * 0.25, y + h * 0.39],
      ],
      warm ? "#f29a66" : "#c27b71",
    );
  });
  // Overlapping shoreline boulders break the vertical faces into a rocky coast.
  for (const [x, y, w, h] of [
    [43, 221, 28, 31],
    [87, 233, 21, 23],
    [120, 230, 26, 28],
    [211, 232, 25, 26],
    [363, 225, 30, 31],
    [437, 229, 26, 29],
  ]) {
    b.polygon(
      [
        [x, y + h],
        [x - 2, y + h * 0.55],
        [x + w * 0.18, y + h * 0.15],
        [x + w * 0.54, y],
        [x + w * 0.78, y + h * 0.16],
        [x + w, y + h * 0.7],
        [x + w * 0.9, y + h],
      ],
      "#55394f",
    );
    b.polygon(
      [
        [x + 2, y + h * 0.55],
        [x + w * 0.23, y + h * 0.18],
        [x + w * 0.53, y + 2],
        [x + w * 0.61, y + h * 0.48],
        [x + w * 0.4, y + h],
      ],
      "#ba6b62",
    );
    b.polygon(
      [
        [x + w * 0.53, y + 2],
        [x + w * 0.76, y + h * 0.2],
        [x + w * 0.92, y + h * 0.72],
        [x + w * 0.76, y + h],
        [x + w * 0.4, y + h],
        [x + w * 0.61, y + h * 0.48],
      ],
      "#8f5361",
    );
    b.polygon(
      [
        [x + 2, y + h * 0.55],
        [x + w * 0.23, y + h * 0.18],
        [x + w * 0.53, y + 2],
        [x + w * 0.57, y + h * 0.11],
        [x + w * 0.27, y + h * 0.25],
        [x + w * 0.12, y + h * 0.58],
      ],
      "#e18b68",
    );
  }
  cliffArt = c;
  return c;
}

export function paintTerrain(ctx, terrain, texture) {
  const surface = (terrain.surfaceCache = Array.from({ length: W }, (_, x) =>
    terrain.surface(x),
  ));
  terrain.artSurface ??= surface.slice();
  const image = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (terrain.data[y * W + x] !== 1) continue;
      const i = ((H - 1 - y) * W + x) * 4;
      image.data[i] = 85;
      image.data[i + 1] = 55;
      image.data[i + 2] = 79;
      image.data[i + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cliffs(), 0, 0, W, H);
  const b = pixelBrush(ctx),
    X = W / 480,
    Y = H / 270;
  const mark = (x, y, w, h, c) => b.rect(x * X, y * Y, w * X, h * Y, c);
  const poly = (p, c) =>
    b.polygon(
      p.map(([x, y]) => [x * X, y * Y]),
      c,
    );
  // Broad topsoil with varied hanging moss fingers and irregular light patches.
  for (let px = 0; px < 480; px++) {
    const x = Math.min(W - 1, Math.floor(px * X)),
      top = (H - surface[x]) / Y;
    if (
      surface[x] < WATER + 5 ||
      Math.abs(surface[x] - terrain.artSurface[x]) > 3
    )
      continue;
    const hanging = 6 + Math.floor(hash(Math.floor(px / 3), 1) * 6);
    mark(px, top, 1, hanging + 2, "#696b31");
    mark(px, top, 1, hanging, "#8f9232");
    mark(
      px,
      top,
      1,
      3 + Math.floor(hash(Math.floor(px / 5), 5) * 3),
      "#a5a43b",
    );
    if (hash(Math.floor(px / 3), 8) > 0.45) mark(px, top, 1, 2, "#b8b047");
  }
  // Dark undersides and warm floor rims describe the physical cave openings.
  for (let px = 0; px < 480; px++) {
    const x = Math.floor(px * X);
    for (let py = 150; py < 238; py++) {
      const y = Math.floor(H - py * Y);
      if (terrain.solid(x, y) && !terrain.solid(x, y - 3)) {
        mark(px, py - 3, 1, 4, "#4a344c");
        mark(px, py - 4, 1, 1, "#795268");
      }
      if (
        !terrain.solid(x, y + 3) &&
        terrain.solid(x, y) &&
        y < surface[x] - 18
      )
        mark(px, py, 1, 2, "#dd956e");
    }
  }
  // Secondary moss ledges over the faces, kept within the collision mask.
  for (const [x, y, w] of [
    [7, 219, 33],
    [97, 208, 45],
    [204, 195, 30],
    [348, 214, 57],
    [416, 195, 47],
  ]) {
    poly(
      [
        [x, y + 3],
        [x + w * 0.45, y - 4],
        [x + w, y],
        [x + w - 2, y + 4],
        [x + w * 0.4, y + 1],
        [x, y + 7],
      ],
      "#8f9232",
    );
    poly(
      [
        [x, y + 2],
        [x + w * 0.45, y - 4],
        [x + w, y],
        [x + w * 0.8, y + 1],
        [x + w * 0.4, y - 1],
      ],
      "#b1aa3d",
    );
  }
  ctx.restore();
  // Sparse, tall grasses and four-petal flowers are explicit pixel clusters.
  const vegetation = (px, py, flower = false) => {
    for (const [dx, dy, h] of [
      [0, 0, 10],
      [3, -2, 14],
      [6, 0, 8],
    ]) {
      mark(px + dx, py - h + dy, 2, h - dy, "#8c963b");
      mark(px + dx + 1, py - h + dy, 1, 3, "#bdb74c");
      mark(px + dx - 1, py - h + dy - 2, 1, 3, "#bdb74c");
    }
    if (flower) {
      mark(px + 10, py - 9, 1, 9, "#78883c");
      mark(px + 7, py - 11, 7, 2, "#f49b6b");
      mark(px + 10, py - 14, 2, 8, "#f49b6b");
      mark(px + 10, py - 11, 1, 2, "#ffcc85");
    }
  };
  for (const px of [
    13, 22, 51, 84, 129, 155, 194, 204, 267, 277, 333, 366, 403, 440, 456,
  ]) {
    const x = Math.floor(px * X),
      top = surface[x];
    if (top < WATER + 12 || Math.abs(top - terrain.artSurface[x]) > 3) continue;
    vegetation(px, (H - top) / Y, px % 3 !== 0);
  }
  // Flower heads are placed separately from grass so their warm silhouettes
  // remain visible on sloping ground instead of disappearing into the turf.
  for (const px of [31, 106, 163, 224, 320, 449]) {
    const x = Math.floor(px * X),
      top = surface[x];
    if (top < WATER + 12 || Math.abs(top - terrain.artSurface[x]) > 3) continue;
    const py = (H - top) / Y;
    for (const [dx, dy] of [
      [0, 0],
      [7, 4],
    ]) {
      mark(px + dx, py - 10 + dy, 2, 10 - dy, "#747f35");
      mark(px + dx - 3, py - 13 + dy, 8, 3, "#f49a68");
      mark(px + dx - 1, py - 16 + dy, 3, 9, "#f49a68");
      mark(px + dx - 1, py - 13 + dy, 3, 3, "#ffce83");
    }
  }
  texture.needsUpdate = true;
}
