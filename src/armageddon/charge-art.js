import { fixedMultiply } from "./numeric.js";
// 004FBAA3–004FBB6E. dx/dy are the fully expanded sight vector.
export function nativeChargeBlobs(power, x, y, dx, dy) {
  const count = (power << 4) >> 16;
  const requests = [];
  for (let i = 0; i < count; i++) {
    const distance =
      ((power & 0xfff) + Math.trunc(Math.imul(i, 0x10ccc) / 16)) | 0;
    requests.push({
      layer: 0xc0001 + i,
      x: (x + fixedMultiply(dx, distance)) | 0,
      y: (y + fixedMultiply(dy, distance)) | 0,
      sprite: 0x303,
      progress: Math.trunc(Math.imul(i, 0x10000) / 16),
    });
  }
  return requests;
}
