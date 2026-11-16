import { nativeSmokeBurst } from "./smoke.js";
export function createImpactBag() {
  return { available: [0, 1, 2, 3], used: [] };
}
// 004EE1D0: rings, impact selection and no-repeat bag, after smoke emission.
export function nativeExplosionArt(mode, x, y, strength, random, bag) {
  const smoke = nativeSmokeBurst(x, y, strength, random),
    effects = [];
  const emit = (sprite, step) =>
    effects.push([0x80000, x, y, 0, 0, 0, 0, 0, sprite, 0, 0x10000, step]);
  if (mode === 1) {
    const size = strength < 40 ? 0 : strength < 60 ? 1 : strength < 80 ? 2 : 3;
    emit(0x349 + size, 0x1999);
    emit(0x34d + size, 0xccc);
    if (strength >= 40) {
      const index = (random() & 0xffff) % bag.available.length;
      const choice = bag.available[index];
      bag.used.push(choice);
      bag.available[index] = bag.available[bag.available.length - 1];
      bag.available.pop();
      if (!bag.available.length) {
        bag.available = bag.used;
        bag.used = [];
      }
      emit(0x345 + choice, 0xa3d);
    }
  } else if (mode === 2) emit(0x33b, 0x51e);
  else if (mode >= 3 && mode <= 5) emit(0x337, 0x1999);
  return { smoke, effects };
}
