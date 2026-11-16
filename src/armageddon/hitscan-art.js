import records from "./scheme-weapon-data.json" with { type: "json" };
import { WEAPON_SLOTS } from "./delays.js";
// 004FCB20 passes record+0x74 to 004FC210/004FC020. Effect mode at
// +0x28 and strength at +0x20 therefore come from weapon +0x9C/+0x94.
// Baseline shotgun variance (+0x98) is zero; damage RNG is not ported here.
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
  collisionMask: shotgun[(0x88 - 0x48) / 4],
});
