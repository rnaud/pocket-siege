export const W = 1200,
  H = 650,
  WATER = 80,
  GRAVITY = 145;
export class Terrain {
  constructor(seed = 42) {
    this.data = new Uint8Array(W * H);
    this.seed = seed;
    for (let x = 45; x < W - 45; x++) {
      const edge = Math.min(1, (x - 45) / 100, (W - 45 - x) / 100);
      const top =
        (235 + 65 * Math.sin(x * 0.007 + seed) + 28 * Math.sin(x * 0.019 + 1)) *
          Math.sqrt(edge) +
        85;
      const bottom = 105 + 22 * Math.sin(x * 0.013);
      for (let y = Math.ceil(bottom); y < top; y++) this.data[y * W + x] = 1;
    }
  }
  solid(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    return x >= 0 && x < W && y >= 0 && y < H && this.data[y * W + x] === 1;
  }
  surface(x) {
    for (let y = H - 1; y >= 0; y--) if (this.solid(x, y)) return y + 1;
    return WATER;
  }
  carve(cx, cy, radius) {
    let removed = 0;
    for (
      let y = Math.max(0, Math.floor(cy - radius));
      y < Math.min(H, cy + radius);
      y++
    )
      for (
        let x = Math.max(0, Math.floor(cx - radius));
        x < Math.min(W, cx + radius);
        x++
      )
        if ((x - cx) ** 2 + (y - cy) ** 2 < radius ** 2) {
          removed += this.data[y * W + x];
          this.data[y * W + x] = 0;
        }
    return removed;
  }
}
export function launch(angle, power) {
  const r = (angle * Math.PI) / 180,
    speed = 160 + power * 3.1;
  return { vx: Math.cos(r) * speed, vy: Math.sin(r) * speed };
}
export function integrate(p, dt, wind = 0) {
  p.vx += wind * dt;
  p.vy -= GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
}
