export const UTILITIES = {
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
    help: "Freeze the other squad for one turn",
  },
};

export const UTILITY_KINDS = Object.keys(UTILITIES);

export function freshUtilities() {
  return Object.fromEntries(
    UTILITY_KINDS.map((kind) => [kind, UTILITIES[kind].fresh]),
  );
}
