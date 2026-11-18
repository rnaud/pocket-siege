import records from "./scheme-weapons.js";
import { WEAPON_SLOTS } from "./delays.js";
import { nativeLaunch } from "./launch.js";
export function nativeBulletLaunch(config, worm, angle, height, random) {
  const radians = angle * Math.PI / 180;
  return nativeLaunch(config.record, {
    x: Math.round(worm.x * 65536), y: Math.round((height - worm.y) * 65536),
    angle: Math.round((Math.asin(Math.sin(radians)) / Math.PI + 0.5) * 65536),
    facing: Math.cos(radians) < 0 ? -1 : 1, random,
  });
}
const baseline = records.schemes.find((s) => s.resource_id === 195).weapons;
export function nativeHitscanWeapon(kind, burst = null) {
  const words = baseline[WEAPON_SLOTS[kind]];
  if (!words) throw new RangeError("Unknown native bullet weapon");
  const at = (offset) => words[(offset - 0x48) / 4];
  const record = Object.fromEntries(words.map((v, i) => ["0x" + (0x48 + i * 4).toString(16), v]));
  return {
    record, total: at(0x74), interval: at(0x78),
    ray: { count: at(0x80), spread: at(0x84), range: at(0xa0), collisionMask: at(0x88) },
    resolution: { mode: at(0x9c), damage: at(0x94), variance: at(0x98), push: at(0x90),
      range: at(0xa0), collisionMask: at(0x88), extentFactor: 1,
      // 004F9FA0 initializes owner 2A4/2A8; 004F7120 advances the ordinal.
      // 004FC020 scales area impulse by these fields for each bullet.
      impulseNumerator: burst?.ordinal ?? 1, impulseDenominator: burst?.total ?? at(0x74) },
  };
}
// 004FCB20 passes record+0x74 to 004FC210/004FC020. Effect mode at
// +0x28 and strength at +0x20 therefore come from weapon +0x9C/+0x94.
// Baseline shotgun variance (+0x98) is zero but resolution still draws RNG.
const shotgun = records.schemes.find((s) => s.resource_id === 195).weapons[
  WEAPON_SLOTS.shotgun
];
export const nativeShotgunImpact = Object.freeze({
  mode: shotgun[(0x9c - 0x48) / 4],
  strength: shotgun[(0x94 - 0x48) / 4],
});

export const nativeShotgunRay = Object.freeze({
  count: shotgun[(0x80 - 0x48) / 4],
  spread: shotgun[(0x84 - 0x48) / 4],
  range: shotgun[(0xa0 - 0x48) / 4],
  collisionMask: shotgun[(0x88 - 0x48) / 4],
});

export const nativeShotgunResolution = Object.freeze({
  mode: nativeShotgunImpact.mode,
  damage: nativeShotgunImpact.strength,
  variance: shotgun[(0x98 - 0x48) / 4],
  push: shotgun[(0x90 - 0x48) / 4],
  range: nativeShotgunRay.range,
  collisionMask: nativeShotgunRay.collisionMask,
  // Context default in 0049CA90; ordinary firing ratio in 004F9B70.
  extentFactor: 1,
  impulseNumerator: 1,
  impulseDenominator: 1,
});
