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
      const depth = Math.min(1, (surface[x] - y) / 150);
      const strata = Math.sin(yPhase + strataX[x]);
      let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      const noise = (((h ^ (h >>> 16)) >>> 0) / 4294967296) * 9 - 4.5;
      let r, g, b;
      if (grass) {
        r = 133;
        g = 177;
        b = 64;
      } else if (rim) {
        r = 67;
        g = 101;
        b = 45;
      } else {
        r = 127 + strata * 13 - depth * 21;
        g = 83 + strata * 10 - depth * 17;
        b = 47 + strata * 8 - depth * 7;
      }
      if (grass && (highlightRow < 0 || data[highlightRow + x] === 0)) {
        r = 194;
        g = 211;
        b = 101;
      }
      const edge =
        x < 4 ||
        data[row + x - 4] === 0 ||
        x + 4 >= W ||
        data[row + x + 4] === 0 ||
        aboveRow < 0 ||
        data[aboveRow + x] === 0;
      if (edge && !grass && !rim) {
        r *= 0.67;
        g *= 0.67;
        b *= 0.67;
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
    ctx.fillStyle = i % 3 ? "#a8784e" : "#61442d";
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
    ctx.strokeStyle = x % 3 ? "#8baa44" : "#c6d67a";
    ctx.beginPath();
    ctx.moveTo(x, H - y + 1);
    ctx.lineTo(x - 2, H - y - 3 - (x % 4));
    ctx.stroke();
  }
  texture.needsUpdate = true;
}
