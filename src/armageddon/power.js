import { fixedMultiply } from "./numeric.js";
export const NATIVE_CHARGE_STEP = 0x369;

// 004F67A0. Signed overflow and the strict >0xffff transition are intentional.
export function nativeChargeTick(type, power) {
  if (type !== 1) return { power, target: null };
  power = (power + NATIVE_CHARGE_STEP) | 0;
  return power > 0xffff
    ? { power: 0x10000, target: 0x69 }
    : { power, target: null };
}

// 004FA840..004FAA11. Raw payload velocity, before projectile constructor/integration.
export function nativeLaunchVelocity(
  record,
  dx,
  dy,
  power,
  state = 0x69,
  inheritedY = 0,
) {
  const charged = () => [
    Math.imul(fixedMultiply(dx, power), 24),
    Math.imul(fixedMultiply(dy, power), 24),
  ];
  switch (record["0x68"]) {
    case 1:
      switch (record["0x70"]) {
        case 1:
          return [Math.imul(dx, 24), Math.imul(dy, 24)];
        case 2:
          return [dx, dy];
        case 3:
          return charged();
        case 4:
          return [Math.imul(dx, 20), Math.imul(dy, 20)];
      }
      break;
    case 2: {
      const result = charged();
      if (state === 0x79) result[1] = (result[1] + inheritedY) | 0;
      return result;
    }
    case 3:
      return [dx, dy];
    case 4:
      if (record["0x6c"] >= 1 && record["0x6c"] <= 24) return [dx, dy];
  }
  return [0, 0];
}
