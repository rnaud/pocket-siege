export const UTILITIES = {
  bungee: {
    label: "Bungee", icon: "⌁", fresh: 1,
    help: "Arm before walking off a ledge; jump or R releases",
  },
  rope: {
    label: "Ninja Rope",
    icon: "⌁",
    fresh: Infinity,
    help: "Fire, swing, shorten and release",
  },
  jetpack: {
    label: "Jet Pack",
    icon: "✦",
    fresh: 1,
    help: "Thrust with the movement keys",
  },
  parachute: {
    label: "Parachute",
    icon: "☂",
    fresh: 1,
    help: "Auto-deploys on a hard fall",
  },
  teleport: {
    label: "Teleport",
    icon: "◎",
    fresh: 1,
    help: "Click a clear spot; ends the turn",
  },
  girder: {
    label: "Girder",
    icon: "▰",
    fresh: 1,
    help: "Build a short platform; ends the turn",
  },
  freeze: {
    label: "Freeze",
    icon: "❄",
    fresh: 1,
    help: "Protect your squad until your next turn",
  },
  fastwalk: {
    label: "Fast Walk",
    icon: "»",
    fresh: 0,
    help: "Accelerate to double walking speed for this turn",
  },
  lowgravity: {
    label: "Low Gravity",
    icon: "↑",
    fresh: 0,
    help: "Halve gravity for this turn",
  },
};

export const UTILITY_KINDS = Object.keys(UTILITIES);

// Native slots67..69 activate from inventory during team updates, not clicks.
export const AUTOMATIC_UTILITIES = {
  doubledamage: { label: "Double Damage", slot: 67 },
  cratespy: { label: "Crate Spy", slot: 68 },
  doubletime: { label: "Double Time", slot: 69 },
};

export function freshUtilities() {
  return Object.fromEntries(
    [...UTILITY_KINDS.map((kind) => [kind, UTILITIES[kind].fresh]),
      ...Object.keys(AUTOMATIC_UTILITIES).map((kind) => [kind, 0])],
  );
}
