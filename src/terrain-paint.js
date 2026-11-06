import { W, H, WATER } from "./physics.js";

// Rebuild the visible terrain texture from the collision mask. The hot loop reads
// the mask directly and uses scalar colors, avoiding a function call and an array
// allocation for every one of the ~780k pixels.
export function paintTerrain(ctx, terrain, texture) {
  terrain.surfaceCache = Array.from({ length: W }, (_, x) =>
    terrain.surface(x),
  );
  const image = ctx.createImageData(W, H);
  const out = image.data;
  const data = terrain.data;
  const surface = terrain.surfaceCache;
  const strataX = new Float32Array(W);
  for (let x = 0; x < W; x++) strataX[x] = Math.sin(x * 0.009) * 2.2;

  for (let y = 0; y < H; y++) {
    const row = y * W;
    const grassRow = y + 7 < H ? row + 7 * W : -1;
    const rimRow = y + 15 < H ? row + 15 * W : -1;
    const aboveRow = y - 4 >= 0 ? row - 4 * W : -1;
    const highlightRow = y + 3 < H ? row + 3 * W : -1;
    const yPhase = y * 0.055;
    const outputRow = (H - 1 - y) * W;
    for (let x = 0; x < W; x++) {
      if (data[row + x] !== 1) continue;
      const grass = grassRow < 0 || data[grassRow + x] === 0;
      const rim = rimRow < 0 || data[rimRow + x] === 0;
      const cut =
        (rimRow >= 0 && data[rimRow + x] === 0) ||
        (grassRow >= 0 && data[grassRow + x] === 0);
      const depth = Math.min(1, (surface[x] - y) / 150);
      const strata = Math.sin(yPhase + strataX[x]);
      let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      const noise = (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 9 - 4.5;
      let r, g, b;
      if (grass) {
        r = 200;
        g = 220;
        b = 103;
      } else if (rim) {
        r = 224;
        g = 197;
        b = 145;
      } else if (cut) {
        r = 196;
        g = 158;
        b = 108;
      } else {
        const band = Math.floor((surface[x] - y) / 44) % 3;
        const paper = [
          [190, 150, 102],
          [166, 117, 80],
          [141, 91, 67],
        ][band];
        r = paper[0] + strata * 6 - depth * 10;
        g = paper[1] + strata * 5 - depth * 8;
        b = paper[2] + strata * 4 - depth * 6;
      }
      if (grass && (highlightRow < 0 || data[highlightRow + x] === 0)) {
        r = 236;
        g = 237;
        b = 153;
      }
      const edge =
        x < 4 ||
        data[row + x - 4] === 0 ||
        x + 4 >= W ||
        data[row + x + 4] === 0 ||
        aboveRow < 0 ||
        data[aboveRow + x] === 0;
      if (edge && !grass && !rim) {
        r = r * 0.48 + 17;
        g = g * 0.48 + 31;
        b = b * 0.48 + 29;
      }
      const i = (outputRow + x) * 4;
      out[i] = r + noise;
      out[i + 1] = g + noise;
      out[i + 2] = b + noise;
      out[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  // Details are clipped to the current collision mask, so craters erase them too.
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 250; i++) {
    const x = (i * 137 + 17) % W,
      y = (i * 83 + 91) % H;
    if (!terrain.solid(x, y)) continue;
    ctx.fillStyle =
      i % 4 === 0 ? "#f0ddb2" : i % 4 === 1 ? "#d17a59" : "#6f5740";
    ctx.beginPath();
    ctx.ellipse(x, H - y, 3 + (i % 8), 2 + (i % 4), 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Fine grass tufts grow only on intact surface, never on the crater walls.
  ctx.lineWidth = 1.3;
  for (let x = 55; x < W - 55; x += 5) {
    const y = surface[x];
    if (y < WATER + 30 || Math.abs(y - surface[x + 3]) > 4) continue;
    ctx.strokeStyle = x % 3 ? "#a9c45d" : "#e5e8a7";
    ctx.beginPath();
    ctx.moveTo(x, H - y + 1);
    ctx.lineTo(x - 2, H - y - 3 - (x % 4));
    ctx.stroke();
  }
  texture.needsUpdate = true;
}
