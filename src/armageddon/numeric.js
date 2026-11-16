// WA 3.0.0.0: 004AE070 (signed 16.16 multiply), 004AE081 (divide).
// BigInt preserves the signed 64-bit intermediate that Number cannot represent.
export const FIXED_ONE = 0x10000;
export function fixedMultiply(a, b) {
  return Number(BigInt.asIntN(32, (BigInt(a | 0) * BigInt(b | 0)) >> 16n));
}
export function fixedDivide(a, b) {
  if ((b | 0) === 0) throw new RangeError("Fixed-point division by zero");
  const quotient = (BigInt(a | 0) << 16n) / BigInt(b | 0);
  if (quotient < -2147483648n || quotient > 2147483647n)
    throw new RangeError("Fixed-point division overflow");
  return Number(quotient);
}
export const fixedInteger = (value) => (value | 0) >> 16;
export const fixedFromInteger = (value) => (value | 0) << 16;

// 004EE960: the completed simulation-frame count participates in every draw.
export function nextLogicRandom(state, frame) {
  return (
    (Math.imul(((state >>> 0) + (frame >>> 0)) >>> 0, 0x19660d) +
      0x3c6ef35f) >>>
    0
  );
}
// 004EE930: separate state used by cosmetic callers such as 004EE020.
export function nextVisualRandom(state) {
  return (Math.imul(state, 0x19660d) + 0x3c6ef35f) >>> 0;
}
