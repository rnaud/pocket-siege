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
    speed = 18 + Math.max(0, Math.min(100, power)) * 4.5;
  return { vx: Math.cos(r) * speed, vy: Math.sin(r) * speed };
}
export function integrate(p, dt, wind = 0) {
  p.vx += wind * dt;
  p.vy -= GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
}

// Gameplay launch geometry is independent of viewport size. Only the rendered rig
// is compensated for the screen's aspect ratio; rotating a phone cannot move a shot.
export function shotGeometry(
  w,
  angle,
  correction = 1,
  _size = 64,
  kind = "rocket",
) {
  const r = (angle * Math.PI) / 180,
    visualAngle = Math.atan2(Math.sin(r), Math.cos(r) / correction);
  const reach = ["rocket", "mortar"].includes(kind) ? 32 : 22;
  const pivot = { x: w.x + (Math.cos(r) < 0 ? -1 : 1) * 5.76, y: w.y + 16 };
  const rigScale =
    1 / Math.hypot(Math.cos(visualAngle) * correction, Math.sin(visualAngle));
  return {
    pivot,
    visualAngle,
    rigScale,
    muzzle: {
      x: pivot.x + Math.cos(r) * reach,
      y: pivot.y + Math.sin(r) * reach,
    },
  };
}

// Shared by the player and the computer, so both start from the visible muzzle.
export function launchGeometry(w, angle, kind = "rocket", terrain = null) {
  const result = shotGeometry(w, angle, 1, 64, kind);
  if (!terrain) return { ...result, blocked: false };
  const { pivot, muzzle } = result;
  // A long weapon must not teleport a projectile through a nearby wall.
  for (let i = 1; i <= 24; i++) {
    const x = pivot.x + ((muzzle.x - pivot.x) * i) / 24,
      y = pivot.y + ((muzzle.y - pivot.y) * i) / 24;
    if (terrain.solid(x, y))
      return { ...result, muzzle: { x, y }, blocked: true };
  }
  return { ...result, blocked: false };
}

// One collision body is used for movement and projectile hits, including the head.
export const BODY = { rx: 17, ry: 27, cy: 17 };
const outline = Array.from({ length: 24 }, (_, i) => ({
  x: Math.cos((i * Math.PI) / 12) * BODY.rx,
  y: BODY.cy + Math.sin((i * Math.PI) / 12) * BODY.ry,
}));
export function bodyBlocked(terrain, x, y) {
  return outline.some((p) => terrain.solid(x + p.x, y + p.y));
}
export function hitsWorm(w, x, y, radius = 0) {
  return (
    ((x - w.x) / (BODY.rx + radius)) ** 2 +
      ((y - w.y - BODY.cy) / (BODY.ry + radius)) ** 2 <=
    1
  );
}
export function blastImpulse(w, x, y, radius, strength = 270) {
  const dx = w.x - x,
    dy = w.y + BODY.cy - y,
    d = Math.hypot(dx, dy);
  if (d >= radius) return 0;
  const factor = 1 - d / radius,
    nx = d > 0.001 ? dx / d : 0,
    ny = d > 0.001 ? dy / d : 1;
  w.vx += nx * strength * factor;
  w.vy += ny * strength * factor;
  w.ground = false;
  w.knocked = true;
  return factor;
}
export function walkWorm(w, terrain, direction, dt) {
  if (!w.ground || w.knocked) return false;
  const x = w.x + direction * 42 * dt;
  for (let rise = 0; rise <= 5; rise++) {
    if (!bodyBlocked(terrain, x, w.y + rise)) {
      w.x = x;
      w.y += rise;
      return true;
    }
  }
  return false;
}
function approachZero(value, amount) {
  return Math.sign(value) * Math.max(0, Math.abs(value) - amount);
}
export function stepWorm(w, terrain, dt) {
  const wasGround = w.ground;
  const supported = bodyBlocked(terrain, w.x, w.y - 1);
  if (w.ground && supported && w.vy <= 0) {
    w.vy = 0;
    w.vx = approachZero(w.vx, 160 * dt);
  } else {
    w.ground = false;
    w.vy -= GRAVITY * dt;
  }
  let landed = false,
    fallDamage = 0;
  // Sweep at subpixel-to-two-pixel intervals so fast knockback cannot tunnel.
  const count = Math.max(
    1,
    Math.ceil((Math.max(Math.abs(w.vx), Math.abs(w.vy)) * dt) / 1.5),
  );
  for (let i = 0; i < count; i++) {
    const h = dt / count,
      nx = w.x + w.vx * h;
    if (!bodyBlocked(terrain, nx, w.y)) w.x = nx;
    else {
      // Stop at the wall; reflected velocity is retained for a real rebound.
      w.vx = w.knocked ? -w.vx * 0.32 : 0;
      if (Math.abs(w.vx) < 3) w.vx = 0;
    }
    const ny = w.y + w.vy * h;
    if (!bodyBlocked(terrain, w.x, ny)) {
      w.y = ny;
    } else if (w.vy < 0) {
      const speed = -w.vy;
      landed = true;
      if (!wasGround && speed > 185)
        fallDamage = Math.max(
          fallDamage,
          Math.min(50, Math.floor((speed - 185) * 0.18)),
        );
      if (w.knocked && speed > 85) {
        w.vy = speed * 0.26;
        w.vx *= 0.72;
        w.ground = false;
      } else {
        w.vy = 0;
        w.ground = true;
      }
    } else {
      w.vy = -Math.abs(w.vy) * 0.25;
    }
  }
  if (w.ground && !bodyBlocked(terrain, w.x, w.y - 1)) w.ground = false;
  if (w.ground && Math.abs(w.vx) < 2) {
    w.vx = 0;
    w.knocked = false;
  }
  return { landed, fallDamage };
}
export function terrainNormal(terrain, x, y, vx, vy, radius = 4) {
  let nx = 0,
    ny = 0;
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8,
      dx = Math.cos(a),
      dy = Math.sin(a);
    if (terrain.solid(x + dx * radius, y + dy * radius)) {
      nx -= dx;
      ny -= dy;
    }
  }
  let length = Math.hypot(nx, ny);
  if (length < 0.001) {
    length = Math.hypot(vx, vy) || 1;
    return { x: -vx / length, y: -vy / length };
  }
  return { x: nx / length, y: ny / length };
}
export function reflectVelocity(p, n, restitution = 0.55) {
  const dot = p.vx * n.x + p.vy * n.y;
  if (dot < 0) {
    p.vx -= (1 + restitution) * dot * n.x;
    p.vy -= (1 + restitution) * dot * n.y;
  }
  // Contact friction, rather than arbitrary drag while flying.
  const tx = -n.y,
    ty = n.x,
    tangent = (p.vx * tx + p.vy * ty) * 0.15;
  p.vx -= tx * tangent;
  p.vy -= ty * tangent;
}
export function chargePower(seconds) {
  return Math.min(100, Math.max(0, (seconds / 2) * 100));
}
