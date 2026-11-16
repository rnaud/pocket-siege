import table from "./trig-table.json" with { type: "json" };
import { fixedMultiply } from "./numeric.js";

// 0049BFB0/0049BFF0: 16-bit turns, 1024 samples with 6-bit interpolation.
function sample(angle, offset) {
  const index = ((angle & 0xffc0) >>> 6) + offset;
  const first = table[index];
  return (
    (first +
      fixedMultiply((table[index + 1] - first) | 0, (angle & 63) << 10)) |
    0
  );
}
export const nativeSin = (angle) => sample(angle, 0);
export const nativeCos = (angle) => sample(angle, 256);
