import { fixedMultiply } from "./numeric.js";
// 004EDA70, smoothing with a minimum step.
function approach(value, target, minimum) {
  const delta = (target - value) | 0;
  const step = Math.max(minimum, Math.abs(fixedMultiply(delta, 0x1999)));
  return Math.abs(delta) <= step
    ? target
    : (value + Math.sign(delta) * step) | 0;
}
// 004DC470. Input dispatch and browser fuel units remain adapters.
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
