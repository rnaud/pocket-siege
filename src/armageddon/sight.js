import { fixedMultiply } from "./numeric.js";
// 004FB47C–004FB4DE. Separate rounded products and signed addition matter.
export function nativeSightTick(opening, aim, target) {
  return {
    opening:
      (fixedMultiply(0xcccc, opening) + fixedMultiply(0x3333, 0x10000)) | 0,
    aim: (fixedMultiply(0x3333, target) + fixedMultiply(0xcccc, aim)) | 0,
  };
}
export function stepOriginalSight(worm, weapon, angle, enabled) {
  if (!enabled) {
    worm.originalSight = null;
    return;
  }
  const pitch = Math.asin(Math.sin((angle * Math.PI) / 180));
  const target = Math.round((pitch / Math.PI + 0.5) * 0xffff);
  let sight = worm.originalSight;
  // 004F61E0 clears opening on equip. Host equip/visibility gates supply
  // the transition; native weapon state dispatch is still incomplete.
  if (!sight || sight.weapon !== weapon)
    sight = { weapon, opening: 0, aim: sight?.aim ?? target };
  worm.originalSight = {
    weapon,
    ...nativeSightTick(sight.opening, sight.aim, target),
  };
}
