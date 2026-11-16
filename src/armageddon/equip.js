import { nativeWeaponAnimation } from "./weapon-animation.js";

const links = {
  0x97: 0xb0,
  0x7a: 0x74,
  0xa4: 0xa1,
  0xb6: 0xb9,
  0xc8: 0xcb,
  0xbf: 0xc2,
  0xda: 0xdd,
  0xd1: 0xd4,
  0x137: 0x134,
  0x164: 0x161,
  0x16d: 0x16a,
  0x1bb: 0x1b8,
  0x1c4: 0x1c1,
  0x1cd: 0x1ca,
  0x1d6: 0x1d3,
  0x1df: 0x1dc,
  0x1ee: 0x1eb,
  0x1fa: 0x1f7,
  0x209: 0x206,
  0x215: 0x212,
  0x227: 0x224,
};
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const quantize = (angle) =>
  Math.trunc(Math.imul((angle << 7) >> 16, 65536) / 128);

// 004F61E0. Angle is native signed 16.16, not browser degrees.
export function nativeWeaponEquip(
  record,
  previousState,
  angle,
  weaponId,
  ropeMode = 0,
  control = 0,
) {
  angle |= 0;
  const calls = [];
  if (previousState === 0x6b) return { calls, angle, control };
  calls.push({ operation: "clear" });
  const sprite = nativeWeaponAnimation(record);
  const queue = (sprite_id, progress = 0) =>
    calls.push({ operation: "queue", sprite_id, progress });
  if (previousState === 0x65) {
    if (links[sprite]) queue(links[sprite]);
    if (sprite === 0xa4) angle = quantize(clamp(angle, 0x8000, 0xd999));
    if (sprite === 0x1df)
      angle = quantize(
        clamp(
          angle,
          ropeMode === 0 ? 0x3333 : ropeMode === 1 ? 0x8000 : 0xc000,
          0x10000,
        ),
      );
    if (sprite === 0x215) angle = clamp(angle, 0x4000, 0xc000);
  }
  control = 0;
  if (record["0x68"] === 1) control = 1;
  if (record["0x68"] === 4) {
    switch (record["0x6c"]) {
      case 2:
      case 6:
        control = 1;
        break;
      case 4:
        control = 2;
        angle = Math.trunc(Math.imul((angle + 0x2000) & 0xffffc000, 4) / 4);
        break;
      case 11:
        control = 1;
        angle = Math.trunc(
          (clamp((Math.imul(angle, 6) + 0x8000) >> 16, 2, 4) << 16) / 6,
        );
        break;
    }
  }
  angle = quantize(angle);
  queue(sprite, control === 1 ? 0x8000 : 0);
  if (weaponId === 3) angle = clamp(angle, 0, 0xfc00);
  return { calls, angle, control };
}
