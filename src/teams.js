// Host team identities. Team 0/1 keep the original Moss/Coral pairing mapped to
// the native green/red palettes; local matches add blue and yellow sides.
// Native team colour ids: 0 red, 1 blue, 2 green, 3 yellow, 4 purple, 5 cyan.
export const MAX_TEAMS = 4;
export const MIN_TEAMS = 2;
export const TEAMS = [
  { name: "MOSS COMPANY", short: "MOSS", color: 2, css: "#80ff80", label: "#4d6b3a", tint: "#b7c86a", glow: 0xd8ffa8,
    worms: ["Sprout", "Moss", "Pickle", "Fern", "Root", "Bud"] },
  { name: "CORAL CREW", short: "CORAL", color: 0, css: "#ff8080", label: "#a94a3d", tint: "#ef9d89", glow: 0xffb090,
    worms: ["Pepper", "Toast", "Chilli", "Ember", "Ash", "Flint"] },
  { name: "TIDE PATROL", short: "TIDE", color: 1, css: "#8080ff", label: "#3d4f9a", tint: "#8fa8ef", glow: 0xa8c0ff,
    worms: ["Ripple", "Drift", "Kelp", "Brine", "Splash", "Wade"] },
  { name: "AMBER LEGION", short: "AMBER", color: 3, css: "#ffff80", label: "#8a7420", tint: "#e8d26a", glow: 0xfff0a0,
    worms: ["Honey", "Sunny", "Mango", "Saffron", "Dandy", "Butter"] },
];
const COLOR_SUFFIX = ["r", "b", "g", "y", "p", "c"];
const COLOR_FONT = ["red", "blu", "grn", "yel", "ppl", "cyn"];
export const teamInfo = (team) => TEAMS[team | 0] ?? TEAMS[1];
// Native palette colour id for a host team index.
export const teamColor = (team) => teamInfo(team).color;
// One-letter sprite suffix (cursorg, arrowdnr, markerb...).
export const teamSpriteSuffix = (team) => COLOR_SUFFIX[teamColor(team)];
// Font file for a native size prefix ("std", "med", "sml").
export const teamFontName = (team, size = "std") => `${size}${COLOR_FONT[teamColor(team)]}1`;
export const colorFontName = (color, size = "std") => `${size}${COLOR_FONT[color]}1`;
export const teamIds = (count) => Array.from({ length: count }, (_, team) => team);
export const clampTeamCount = (value) =>
  Math.max(MIN_TEAMS, Math.min(MAX_TEAMS, Number.isInteger(+value) ? +value : MIN_TEAMS));
