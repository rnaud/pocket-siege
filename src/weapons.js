import { WATER } from "./physics.js";

// One source of truth for damage, blast size, flight behavior and inventory.
export const WEAPONS = {
  rocket: {
    label: "Bazooka",
    icon: "➶",
    radius: 53,
    damage: 50,
    wind: true,
    speed: 1,
    timed: false,
    bounces: false,
    ammo: Infinity,
    key: "F1",
  },
  grenade: {
    label: "Grenade",
    icon: "✹",
    radius: 60,
    damage: 50,
    wind: false,
    speed: 1,
    timed: true,
    bounces: true,
    ammo: 3,
    key: "F2",
  },
  mortar: {
    label: "Mortar",
    icon: "◆",
    radius: 76,
    damage: 65,
    wind: false,
    speed: 0.7,
    timed: false,
    bounces: false,
    ammo: 2,
    key: "F3",
  },
  sticky: {
    label: "Sticky",
    icon: "✿",
    radius: 64,
    damage: 50,
    wind: false,
    speed: 1,
    timed: true,
    bounces: false,
    ammo: 2,
    key: "F4",
  },
};
export const WEAPON_ORDER = ["rocket", "grenade", "mortar", "sticky"];
export const freshAmmo = () => ({
  grenade: WEAPONS.grenade.ammo,
  mortar: WEAPONS.mortar.ammo,
  sticky: WEAPONS.sticky.ammo,
});
export const ammoFor = (loadout, kind) =>
  kind === "rocket" ? Infinity : (loadout?.[kind] ?? 0);

export const SUDDEN_DEATH_ROUND = 6;
export const WATER_RISE = 18;
export const MAX_WATER = 250;
// Every round from sudden death on, the sea climbs a little higher.
export function waterLevelForRound(round) {
  if (round < SUDDEN_DEATH_ROUND) return WATER;
  return Math.min(
    MAX_WATER,
    WATER + (round - SUDDEN_DEATH_ROUND + 1) * WATER_RISE,
  );
}
