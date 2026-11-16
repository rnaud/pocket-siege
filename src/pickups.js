import { addAmmo } from "./armageddon/inventory.js";
export const PICKUP_KINDS = [
  "health",
  "grenade",
  "mortar",
  "sticky",
  "utility",
];

export function applyPickup(kind, hp, loadout) {
  if (kind === "health") return { hp: Math.min(100, hp + 25), loadout };
  return {
    hp,
    loadout: {
      ...loadout,
      [kind]: addAmmo(loadout[kind], 1),
    },
  };
}
