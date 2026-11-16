import { fixedMultiply, fixedDivide } from "./numeric.js";
import { nativeSin, nativeCos } from "./trig.js";

// 004F4CB0: impulse adds to momentum; suspended bodies reject it.
export function nativeBodyImpulse(body, x, y, rotation = 0) {
  if (body.suspended)
    return {
      vx: body.vx,
      vy: body.vy,
      angularVelocity: body.angularVelocity,
      result: 0,
    };
  return {
    vx: (body.vx + fixedDivide(x, body.mass)) | 0,
    vy: (body.vy + fixedDivide(y, body.mass)) | 0,
    angularVelocity: (body.angularVelocity + rotation) | 0,
    result: 1,
  };
}

// State 0x77 branch, 004DEA1C..004DEB81. Direction is the signed native
// field +0x2b0, backflip is field +0x2b4, facing is field +0x1b0.
export function nativeWormJumpLaunch(
  progress,
  direction,
  backflip,
  facing,
  body,
) {
  if ((progress & 0xffff0000) < 65536)
    return { impulse: null, target: null, body: { ...body }, accepted: null };
  const angle =
    direction > 0
      ? 0x2aaa
      : direction < 0
        ? 0x38e3
        : backflip
          ? 0x3d70
          : 0x4000;
  let x = fixedMultiply(nativeCos(angle), 0x48000);
  let y = fixedMultiply(nativeSin(angle), 0x48000);
  x = Math.imul(facing, x);
  if (direction === 0 && backflip) {
    x = Math.trunc(Math.imul(x, 3) / 2);
    y = Math.trunc((y << 2) / -3);
  } else y = -y | 0;
  if (direction <= 0) x = -x | 0;
  const { result, ...velocity } = nativeBodyImpulse(body, x, y, 0);
  return {
    impulse: [x, y, 0],
    target: 0x79,
    body: { ...body, ...velocity },
    accepted: result,
  };
}
