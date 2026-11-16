import { fixedDivide, fixedMultiply } from "./numeric.js";
// 004AE15F / 004AE0EC normalize to a 15-bit mantissa, then use byte
// sqrt tables at 00567658/0056B658. Every table entry equals floor(sqrt(
// (16384+index)*1 or *2)); retain their quantization before exponent scaling.
export function nativeVectorLength(x, y) {
  const square = BigInt(x | 0) ** 2n + BigInt(y | 0) ** 2n;
  if (!square) return 0;
  const shift = square.toString(2).length - 15;
  const mantissa = Number(
    shift >= 0 ? square >> BigInt(shift) : square << BigInt(-shift),
  );
  const value = Math.floor(Math.sqrt(mantissa * (shift & 1 ? 2 : 1)));
  const exponent = Math.floor(shift / 2);
  return exponent >= 0 ? value << exponent : value >>> -exponent;
}
// 004F4560 returns damage while applying radial impulse through +0x118.
// impulseScale is body+0xD8; extentFactor is context+0x814.
export function nativeBlastDamage(body, x, y, push, damage, extentFactor = 1) {
  const radius = Math.imul((Math.imul(extentFactor, damage) + 2) | 0, 0x20000);
  if (!radius) return { damage: 0, impulses: [] };
  let dx = (body.x - x) | 0,
    dy = (body.y - y) | 0;
  const distance = nativeVectorLength(dx, dy);
  if (distance) {
    dx = fixedDivide(dx, distance);
    dy = fixedDivide(dy, distance);
  }
  if (distance > radius) return { damage: 0, impulses: [] };
  const strength = fixedMultiply(
    damage,
    fixedDivide((radius - distance) | 0, radius),
  );
  const impulses = [];
  if (strength) {
    const component = (value) =>
      Math.trunc(
        Math.imul(
          push,
          fixedMultiply(
            Math.trunc(Math.imul(value, strength) / 5),
            body.impulseScale,
          ),
        ) / 100,
      );
    impulses.push([component(dx), component(dy), 0]);
  }
  return { damage: strength, impulses };
}
