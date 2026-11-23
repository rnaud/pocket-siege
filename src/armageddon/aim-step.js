import records from "./scheme-weapons.js";

// 004FB567..004FB915, one frame of a held aim key in the worm's aim state:
// the worm's aim (+0x260, 0 = straight down, 0x10000 = straight up) moves
// 0x200 per frame, the Longbow (weapon subtype 0xA at record +0x6C) keeps
// to 0x4000..0xC000, the aim snaps down to a multiple of 0x200 within
// 0..0x10000, and the Mortar (weapon slot 3 at +0x170) stops at 0xFC00.
const clamp = (value, min, max) => (min > value ? min : max < value ? max : value);

export function nativeAimStep(aim, { down = false, up = false, subtype = 0, slot = 0 }) {
  let value = aim | 0;
  if (down) value = (value - 0x200) | 0;
  if (up) value = (value + 0x200) | 0;
  if (subtype === 0xa) value = clamp(value, 0x4000, 0xc000);
  const steps = (value << 7) >> 16;
  value = clamp(Math.trunc((steps << 16) / 128), 0, 0x10000);
  if (slot === 3) value = clamp(value, 0, 0xfc00);
  return value;
}

// Default-scheme weapon subtype (record +0x6C) for a weapon slot.
const weapons = records.schemes.find((scheme) => scheme.resource_id === 195).weapons;
export function nativeWeaponSubtype(slot) {
  return weapons[slot]?.[(0x6c - 0x48) / 4] ?? 0;
}
