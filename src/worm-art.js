import { pixelBrush } from "./pixel-draw.js";

// Whole-body poses authored on a 32px grid; no scaled or rotated sprite frames.
export function drawWorm(ctx, team, pose) {
  const { polygon: poly, rect } = pixelBrush(ctx);
  const ink = "#433244",
    body = team ? "#ed9987" : "#b5bc75";
  const shade = team ? "#be7079" : "#818a53",
    light = team ? "#ffd0a6" : "#e3d99a";
  const walking = ["walk", "walk2", "walk3"].includes(pose);
  const tuck = pose === "walk2" || pose === "land";
  const air = pose === "jump" || pose === "fall";
  const dx =
    pose === "recoil" ? -2 : pose === "aim" ? 1 : pose === "walk3" ? 1 : 0;
  const dy = tuck ? 2 : air ? -2 : 0;
  const hx = 14 + dx,
    hy = 7 + dy;
  const tail = tuck ? 8 : pose === "walk3" ? 2 : 4;
  poly(
    [
      [hx + 1, hy + 8],
      [hx + 11, hy + 8],
      [hx + 10, 20],
      [24, 25],
      [22, 28],
      [17, 30],
      [9, 30],
      [tail, 28],
      [tail - 1, 25],
      [tail + 1, 25],
      [9, 27],
      [14, 27],
      [16, 24],
      [15, 20],
    ],
    ink,
  );
  poly(
    [
      [hx + 2, hy + 9],
      [hx + 9, hy + 9],
      [hx + 8, 20],
      [22, 25],
      [20, 28],
      [16, 29],
      [9, 29],
      [tail + 1, 27],
      [10, 28],
      [15, 28],
      [18, 25],
      [17, 20],
    ],
    body,
  );
  poly(
    [
      [21, 19],
      [23, 24],
      [21, 27],
      [17, 29],
      [10, 29],
      [15, 27],
      [19, 24],
    ],
    shade,
  );
  // Compact rounded head and a one-pixel chin, continuous with the neck.
  poly(
    [
      [hx + 3, hy],
      [hx + 9, hy],
      [hx + 12, hy + 3],
      [hx + 12, hy + 7],
      [hx + 10, hy + 10],
      [hx + 4, hy + 11],
      [hx + 1, hy + 8],
      [hx, hy + 3],
    ],
    ink,
  );
  poly(
    [
      [hx + 3, hy + 1],
      [hx + 9, hy + 1],
      [hx + 11, hy + 3],
      [hx + 11, hy + 7],
      [hx + 9, hy + 9],
      [hx + 4, hy + 10],
      [hx + 2, hy + 7],
      [hx + 1, hy + 3],
    ],
    body,
  );
  rect(hx + 3, hy + 1, 5, 1, light);
  rect(hx + 2, hy + 2, 2, 2, light);
  rect(17, 20, 1, 5, light);
  rect(11, 28, 4, 1, light);
  const closed = [true, "blink", "recoil", "land"].includes(pose);
  for (const x of [hx + 4, hx + 9]) {
    if (closed) rect(x, hy + 5, 3, 1, ink);
    else {
      rect(x, hy + 3, 3, 3, "#fff0c8");
      rect(x + 2, hy + 4, 1, 2, ink);
    }
  }
  if (pose === "aim") rect(hx + 4, hy + 3, 3, 1, ink);
  rect(hx + 7, hy + 8, 3, 1, ink);
  if (pose === "panic" || pose === "fall" || pose === true) {
    rect(hx + 7, hy + 7, 3, 3, ink);
    rect(hx + 8, hy + 7, 1, 1, "#fff0c8");
  }
  if (air) {
    rect(10, 23, 6, 2, ink);
    rect(11, 23, 4, 1, body);
  }
  if (walking) rect(tail + 2, 28, 3, 1, light);
  if (pose === "victory") {
    rect(11, 17, 4, 2, ink);
    rect(10, 13, 2, 5, ink);
    rect(10, 12, 3, 3, light);
    rect(hx + 6, hy + 7, 5, 2, ink);
    rect(hx + 7, hy + 7, 3, 1, "#fff0c8");
  }
}
