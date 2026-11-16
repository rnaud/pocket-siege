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
