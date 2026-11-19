export const SCHEMES = {
  // Pace matches the original default scheme (resource 195): 45 s turns,
  // 3 s retreat and Sudden Death Event 2 (every worm to 1 HP) after the
  // 15-minute round, with the scheme's water rise.
  classic: {
    label: "Classic duel",
    format: "single",
    weather: "clear",
    modifier: "standard",
    turnTime: 45,
    retreatTime: 3,
    suddenDeath: "health",
    stockpile: false,
    crateRain: false,
  },
  blitz: {
    label: "Blitz",
    format: "single",
    weather: "clear",
    modifier: "quick-turns",
    turnTime: 30,
    retreatTime: 5,
    suddenDeath: "health",
    stockpile: false,
    crateRain: true,
  },
  crates: {
    label: "Crate rain",
    format: "single",
    weather: "clear",
    modifier: "standard",
    turnTime: 45,
    retreatTime: 3,
    suddenDeath: "water",
    stockpile: false,
    crateRain: true,
  },
  stockpile: {
    label: "Stockpile",
    format: "best3",
    weather: "clear",
    modifier: "standard",
    turnTime: 45,
    retreatTime: 3,
    suddenDeath: "water",
    stockpile: true,
    crateRain: true,
  },
  armageddon: {
    label: "Armageddon",
    format: "single",
    weather: "storm",
    modifier: "standard",
    turnTime: 60,
    retreatTime: 3,
    suddenDeath: "nuke",
    stockpile: false,
    crateRain: true,
  },
};

export const SCHEME_OPTIONS = Object.entries(SCHEMES).map(
  ([value, preset]) => ({
    value,
    label: preset.label,
  }),
);
