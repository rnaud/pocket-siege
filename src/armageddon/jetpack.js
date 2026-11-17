import { fixedMultiply } from "./numeric.js";
// 004EDA70, smoothing with a minimum step.
function approach(value, target, minimum) {
  const delta = (target - value) | 0;
  const step = Math.max(minimum, Math.abs(fixedMultiply(delta, 0x1999)));
  return Math.abs(delta) <= step
    ? target
    : (value + Math.sign(delta) * step) | 0;
}
// 004DC470. Browser fuel units remain an adapter.
export function nativeJetpackTick({ facing, lean, side, down, fuel }) {
  lean = approach(lean, facing < 0 ? -0x38000 : 0x38000, 0x10000);
  const magnitude = Math.abs(lean);
  const sprite = 0x35 - (magnitude >= 0x8000 ? (magnitude - 0x8000) >> 16 : 0);
  let target = null;
  if (fuel !== 0) {
    fuel = (fuel + Math.trunc(((side + down) | 0) / -10)) | 0;
    if (fuel <= 0) {
      fuel = 0;
      target = 0x65;
    }
  }
  return {
    lean,
    sprite,
    side: approach(side, 0, 0x1999),
    down: approach(down, 0, 0x1999),
    fuel,
    target,
  };
}

// 004DC560: directional input is boolean; opposing horizontal keys cancel.
// The impulse precedes the velocity getter and the +/-5 px/tick speed clamp.
export function nativeJetpackInput(input, { left = false, right = false, up = false }, gravity) {
  let { facing, side, down } = input;
  const force = Math.trunc(Math.imul(gravity, 5) / 3);
  let x = 0, y = 0;
  if (Boolean(left) !== Boolean(right)) {
    facing = left ? -1 : 1;
    x = facing * Math.trunc(force / 2);
    side = Math.max(0, Math.min(65536, (side + 0x4ccc) | 0));
  }
  if (up) {
    y = -force;
    down = Math.max(0, Math.min(65536, (down + 0x4ccc) | 0));
  }
  return { facing, side, down, impulse: [x || 0, y || 0, 0] };
}
export function nativeJetpackVelocity(vx, vy) {
  return { vx: Math.max(-0x50000, Math.min(0x50000, vx)),
    vy: Math.max(-0x50000, Math.min(0x50000, vy)) };
}
