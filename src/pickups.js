import { addAmmo } from "./armageddon/inventory.js";
import { nativePickupHealth } from "./armageddon/crate-transfer.js";
export const PICKUP_KINDS = [
  "health",
  "grenade",
  "mortar",
  "sticky",
  "utility",
];

export function applyPickup(kind, hp, loadout, quantity = kind === "health" ? 25 : 1) {
  if (kind === "health") return { hp: nativePickupHealth(hp, quantity), loadout };
  return {
    hp,
    loadout: {
      ...loadout,
      [kind]: addAmmo(loadout[kind], quantity),
    },
  };
}
