import { nativeDamageVariation } from "./hitscan-resolution.js";

// 004E2EA0: event packet and secondary emission selection. Secondary
// constructors remain separate interfaces, dispatched after the primary blast.
export function nativeProjectileDetonation(body, x, y, random) {
  const calls = [];
  if (body.sprite === 0x29c)
    calls.push({ operation: "sound", request: [0x40, 5, 65536, 65536, 0] });
  const damage = nativeDamageVariation(body.damage, body.variance, random);
  if (damage) {
    const offset = Math.trunc(Math.imul(body.offset, body.damage) / 200) << 16;
    calls.push({ operation: "blast", request: [1, x, (y + offset) | 0, body.push, damage, 1] });
  }
  if (body.secondary === 1 && !body.repeat)
    calls.push({ operation: "fragments", request: [x, y] });
  else if (body.secondary === 2)
    calls.push({ operation: "fire", request: [x, y] });
  return calls;
}
