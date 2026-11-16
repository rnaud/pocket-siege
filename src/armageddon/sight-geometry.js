import { nativeSin, nativeCos } from "./trig.js";
import { fixedMultiply } from "./numeric.js";
// 004FB9C3–004FBA79. Coordinates use native downward-positive 16.16 axes.
export function nativeSightGeometry(x, y, aim, facing, opening) {
  const direction = facing < 0 ? (0x20000 - aim) | 0 : aim | 0;
  const half = Math.trunc(direction / 2);
  const vx = nativeSin(half),
    vy = nativeCos(half);
  return {
    x: (x + Math.imul(vx, 14)) | 0,
    y: (y + Math.imul(vy, 14)) | 0,
    dx: fixedMultiply(vx, Math.imul(opening, 80)),
    dy: fixedMultiply(vy, Math.imul(opening, 80)),
  };
}
