import { nativeVectorAngle } from "./flight-art.js";
import { nativeSin, nativeCos } from "./trig.js";
import { nativeVectorLength } from "./blast-damage.js";
import { fixedMultiply, fixedDivide } from "./numeric.js";
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// 004E30F0: guidance integrates an independent velocity accumulator. It
// accelerates toward the target and proportionally caps each axis at16px/tick.
export function nativeHomingSteer(input) {
  const body = { ...input };
  if (!body.initialized) {
    body.steerX = body.vx;
    body.steerY = body.vy;
    body.initialized = 1;
  }
  let dx = (body.targetX - body.x) | 0, dy = (body.targetY - body.y) | 0;
  const distance = nativeVectorLength(dx, dy);
  if (distance < 65536) return body;
  dx = fixedDivide(dx, distance);
  dy = fixedDivide(dy, distance);
  const strength = Math.trunc(clamp((0x7800000 - distance) | 0, 0x1e00000, 0x7800000) / 0x780);
  body.steerX = (body.steerX + (fixedMultiply(dx, strength) << 1)) | 0;
  body.steerY = (body.steerY + (fixedMultiply(dy, strength) << 1)) | 0;
  let vx = clamp(body.steerX, -0x100000, 0x100000), vy;
  if (vx !== body.steerX)
    vy = fixedDivide(fixedMultiply(vx, body.steerY), body.steerX);
  else {
    vy = clamp(body.steerY, -0x100000, 0x100000);
    if (vy !== body.steerY)
      vx = fixedDivide(fixedMultiply(vy, body.steerX), body.steerY);
  }
  body.vx = body.steerX = vx;
  body.vy = body.steerY = vy;
  return body;
}

// 004E3D80. Activation and expiration occur on separate simulation ticks.
export function nativeHomingSchedule(input, callbacks = {}) {
  const body = { ...input }, calls = [];
  if (body.delay) {
    body.delay = (body.delay - 20) | 0;
    if (body.delay < 1) {
      if (body.owner)
        calls.push({ operation: "event", request: [20, 0, 0x435, 0x124, body.owner] });
      body.delay = 0;
    }
  } else if (body.duration) {
    if (body.kind === 1 || body.kind === 2) {
      calls.push({ operation: "steer" });
      callbacks.steer?.(body);
      if (body.kind === 2) {
        calls.push({ operation: "avoid" });
        callbacks.avoid?.(body);
      }
    }
    body.duration = (body.duration - 20) | 0;
    if (body.duration < 1) {
      body.duration = 0;
      body.initialized = 0;
    }
  }
  return { body, calls };
}

// 004E3270: terrain-aware guidance used by kind2 (Homing Pigeon).
// solid receives native integer coordinates. Preserve query order: lower-Y
// wins a tie in the nearby scan, and the forward scan always checks once.
export function nativeHomingAvoid(input, solid) {
  const body = { ...input };
  const dx = (body.targetX - body.x) | 0;
  let remaining = Math.min(300, nativeVectorLength(dx, (body.targetY - body.y) | 0) >> 16);
  let speed = nativeVectorLength(body.steerX, body.steerY);
  let angle = nativeVectorAngle(body.steerX, -body.steerY);
  let side = 0;
  const px = body.x >> 16, py = body.y >> 16;
  for (let offset = 5; offset < 25 && !side; offset += 5) {
    if (solid(px, py - offset)) side = -1;
    else if (solid(px, py + offset)) side = 1;
  }
  let x = body.x, y = body.y;
  const stepX = Math.imul(nativeSin(angle), 10), stepY = Math.imul(nativeCos(angle), -10);
  do {
    if (solid(x >> 16, y >> 16)) {
      const negative = side === 0 ? dx > 0 && body.steerX > 0
        : body.steerX > 0 && side === 1 || body.steerX < 0 && side === -1;
      angle = (angle + Math.trunc((remaining << 16) / (negative ? -700 : 700))) | 0;
      speed = 0xc0000;
      break;
    }
    x = (x + stepX) | 0;
    y = (y + stepY) | 0;
    remaining -= 20;
  } while (remaining > 0);
  body.vx = body.steerX = clamp(fixedMultiply(speed, nativeSin(angle)), -0x100000, 0x100000);
  body.vy = body.steerY = clamp((-fixedMultiply(speed, nativeCos(angle))) | 0, -0x100000, 0x100000);
  return body;
}
