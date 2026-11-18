import { fixedMultiply, fixedDivide } from "./numeric.js";
const abs = (v) => ((v ^ (v >> 31)) - (v >> 31)) | 0;
const short = (v) => (v << 16) >> 16;

// 0049C440: the original fixed-point atan polynomial, measured in16-bit turns.
function polynomial(value) {
  const square = fixedMultiply(value, value);
  let term = fixedMultiply(0x555, square);
  term = fixedMultiply((term - 0x15cb) | 0, square);
  term = fixedMultiply((term + 0x2e1d) | 0, square);
  term = fixedMultiply((term - 0x548e) | 0, square);
  return short(fixedDivide(fixedMultiply((term + 0xfff7) | 0, value), 0x6487e));
}
export function nativeSlopeTurn(value) {
  if (value > 65536) return short(0x4000 - polynomial(fixedDivide(65536, value)));
  if (value < -65536) return short(-0x4000 - polynomial(fixedDivide(65536, value)));
  return polynomial(value);
}

// 0049C030: angle from the positive Y axis toward positive X. Preserve the
// signed-short result and the signed-overflow/tiny-vector early return.
export function nativeDirectionTurn(x, y) {
  x |= 0; y |= 0;
  const ax = abs(x), ay = abs(y);
  if (((ax + ay) | 0) < 6) return 0;
  if (ax <= ay) {
    const angle = nativeSlopeTurn(fixedDivide(x, y));
    return short(y < 0 ? angle - 0x8000 : angle);
  }
  return short((x < 0 ? -0x4000 : 0x4000) - nativeSlopeTurn(fixedDivide(y, x)));
}
