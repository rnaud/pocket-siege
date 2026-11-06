export const MODIFIERS = {
  standard: {
    label: "Standard",
    gravityScale: 1,
    blastScale: 1,
    turnSeconds: 45,
  },
  "low-gravity": {
    label: "Low gravity",
    gravityScale: 0.55,
    blastScale: 1,
    turnSeconds: 45,
  },
  "big-blasts": {
    label: "Big blasts",
    gravityScale: 1,
    blastScale: 1.35,
    turnSeconds: 45,
  },
  "quick-turns": {
    label: "Quick turns",
    gravityScale: 1,
    blastScale: 1,
    turnSeconds: 30,
  },
  "moon-chaos": {
    label: "Moon chaos",
    gravityScale: 0.55,
    blastScale: 1.35,
    turnSeconds: 30,
  },
};

export function modifierSettings(value = "standard") {
  return MODIFIERS[value] ?? MODIFIERS.standard;
}
