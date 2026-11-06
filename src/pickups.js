export const PICKUP_KINDS = ["health", "grenade", "mortar", "sticky"];

export function applyPickup(kind, hp, loadout) {
  if (kind === "health") return { hp: Math.min(100, hp + 25), loadout };
  return {
    hp,
    loadout: {
      ...loadout,
      [kind]: Math.min(9, (loadout[kind] ?? 0) + 1),
    },
  };
}
