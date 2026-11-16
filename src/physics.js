import { NATIVE_CHARGE_STEP } from "./armageddon/power.js";
import { LOGIC_STEP_SECONDS } from "./armageddon/clock.js";
import { nativeSweep } from "./armageddon/motion.js";
import { generateTerrain } from "./map-generator.js";
import { islandTop, islandVoid } from "./island-profile.js";
import { nativeSin, nativeCos } from "./armageddon/trig.js";
import collisionShapes from "./armageddon/collision-shapes.json" with { type: "json" };
export let W = 1200,
  H = 650;
export function setWorldDimensions(width = 1200, height = 650) {
  W = width;
  H = height;
}
export const WATER = 80,
  GRAVITY = 145;
export class Terrain {
  constructor(seed = 42, layout = "fern") {
    this.data = new Uint8Array(W * H);
    this.seed = seed;
    this.layout = layout;
    if (layout !== "fern") {
      generateTerrain(this.data, W, H, seed, layout);
      return;
    }
    for (let x = 13; x < W - 10; x++) {
      const top = H * (1 - islandTop((x / W) * 480, seed) / 270);
      const bottom = 30 + 8 * Math.sin(x * 0.03);
      for (let y = Math.ceil(bottom); y < top; y++) {
        const px = (x / W) * 480,
          py = ((H - y) / H) * 270;
        // A small sea arch makes the foreground read as sculpted rock.
        if (islandVoid(px, py)) continue;
        this.data[y * W + x] = 1;
      }
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
  // Browser degrees/power remain adapters; direction uses the original integer
  // lookup/interpolation used by the native launch routine.
  const turn = Math.round((angle * 65536) / 360),
    speed = 18 + Math.max(0, Math.min(100, power)) * 4.5;
  return {
    vx: (nativeCos(turn) / 65536) * speed,
    vy: (nativeSin(turn) / 65536) * speed,
  };
}
export function integrate(p, dt, wind = 0, gravityScale = 1) {
  p.vx += wind * dt;
  p.vy -= GRAVITY * gravityScale * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
}

// Browser world uses upward-positive y and per-second floating velocities.
// Sweep the already integrated displacement in the native downward pixel grid.
export function sweepProjectile(from, to, collide) {
  const fixed = (value) => Math.round(value * 65536) | 0;
  const result = nativeSweep(
    {
      x: fixed(from.x),
      y: fixed(H - from.y),
      vx: fixed(to.x - from.x),
      vy: fixed(from.y - to.y),
    },
    65536,
    (x, y) => collide(x / 65536, H - y / 65536),
  );
  return { ...result, x: result.x / 65536, y: H - result.y / 65536 };
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

// Native worm shape 3. Host positions now denote the physics body/canvas
// center. Source bitmap rows are downward-positive; host terrain rows are
// upward-positive, with row H-1 corresponding to original row zero.
export const WORM_MASK = collisionShapes.shapes[3];
export const BODY = {
  rx: WORM_MASK.width / 2,
  ry: WORM_MASK.height / 2,
  cy: 0,
};
export function bodyBlocked(terrain, x, y) {
  const left = Math.floor(x) - WORM_MASK.anchorX,
    top = Math.ceil(y) - 1 + WORM_MASK.anchorY;
  return WORM_MASK.planes[0].points.some(([px, py]) =>
    terrain.solid(left + px, top - py),
  );
}
export function hitsWorm(w, x, y, radius = 0) {
  const left = Math.floor(w.x) - WORM_MASK.anchorX,
    top = Math.ceil(w.y) - 1 + WORM_MASK.anchorY;
  // Host projectiles still supply circular radii. Test those against actual
  // occupied worm pixels; projectile-specific native masks are a separate port.
  return WORM_MASK.planes[0].points.some(([px, py]) => {
    const dx = Math.max(left + px - x, 0, x - (left + px + 1)),
      dy = Math.max(top - py - y, 0, y - (top - py + 1));
    if (!radius)
      return Math.floor(x) === left + px && Math.floor(y) === top - py;
    return dx * dx + dy * dy <= radius * radius;
  });
}
export function blastImpulse(w, x, y, radius, strength = 270) {
  const dx = w.x - x,
    dy = w.y + BODY.cy - y,
    d = Math.hypot(dx, dy);
  if (d >= radius) return 0;
  const factor = 1 - d / radius,
    nx = d > 0.001 ? dx / d : 0,
    ny = d > 0.001 ? dy / d : 1,
    push = strength * factor;
  // Native frozen blast response clears horizontal impulse, retaining vertical.
  w.vx = w.frozen > 0 ? 0 : w.vx + nx * push;
  // A little lift makes side hits arc away instead of sliding along the floor,
  // but cap it so a blast from below cannot launch a worm off the top of the map.
  w.vy += Math.min(ny + 0.4, 0.65) * push;
  w.ground = false;
  w.knocked = true;
  return factor;
}
export function walkWorm(w, terrain, direction, dt) {
  if (!w.ground || w.knocked) return false;
  const startY = w.y;
  w.walkDirection = Math.sign(direction);
  const steps = Math.max(1, Math.ceil(42 * dt));
  let moved = false;
  for (let step = 0; step < steps; step++) {
    const x = w.x + (Math.sign(direction) * 42 * dt) / steps;
    let found = false;
    for (let rise = 0; rise <= 6; rise++) {
      if (bodyBlocked(terrain, x, w.y + rise)) continue;
      let y = w.y + rise;
      for (let drop = 0; drop < 6 && !bodyBlocked(terrain, x, y - 1); drop++)
        y--;
      w.x = x;
      w.y = y;
      w.ground = bodyBlocked(terrain, x, y - 1);
      found = moved = true;
      break;
    }
    if (!found || !w.ground) break;
  }
  w.walkRise = w.y - startY;
  return moved;
}

function approachZero(value, amount) {
  return Math.sign(value) * Math.max(0, Math.abs(value) - amount);
}
export function stepWorm(w, terrain, dt, gravityScale = 1) {
  const wasGround = w.ground;
  const supported = bodyBlocked(terrain, w.x, w.y - 1);
  if (w.ground && supported && w.vy <= 0) {
    w.vy = 0;
    w.vx = approachZero(w.vx, 160 * dt);
  } else {
    w.ground = false;
    w.vy -= GRAVITY * gravityScale * dt;
  }
  let landed = false,
    landingSpeed = 0,
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
      landingSpeed = Math.max(landingSpeed, speed);
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
  return { landed, landingSpeed, fallDamage };
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
  const ticks = Math.max(0, Math.floor(seconds / LOGIC_STEP_SECONDS + 1e-9));
  return (Math.min(65536, ticks * NATIVE_CHARGE_STEP) / 65536) * 100;
}

// Sample intervening rock before a blast carves it away. Thick cover attenuates
// damage, while exposed targets receive the full radial blast.
export function blastExposure(terrain, x, y, targetX, targetY) {
  const distance = Math.hypot(targetX - x, targetY - y);
  const steps = Math.ceil(distance / 4);
  let rock = 0;
  for (let i = 2; i < steps - 1; i++) {
    if (
      terrain.solid(
        x + ((targetX - x) * i) / steps,
        y + ((targetY - y) * i) / steps,
      )
    )
      rock++;
  }
  return rock > 6 ? 0.45 : rock > 2 ? 0.75 : 1;
}

export function clearBodyPath(terrain, x, y, targetX, targetY) {
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(targetX - x, targetY - y) / 2),
  );
  for (let i = 1; i <= steps; i++) {
    if (
      bodyBlocked(
        terrain,
        x + ((targetX - x) * i) / steps,
        y + ((targetY - y) * i) / steps,
      )
    )
      return false;
  }
  return true;
}
