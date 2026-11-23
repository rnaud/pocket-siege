// Slot identities from WA 3.0.0.0 mission inventory loader 0043F2E0.
// The saved browser key napalm now selects the original Petrol Bomb (slot47).
export const WEAPON_SLOTS = Object.freeze({
  rocket: 1,
  homing: 2,
  mortar: 3,
  pigeon: 4,
  magic: 61,
  grenade: 6,
  cluster: 7,
  banana: 8,
  axe: 9,
  firepunch: 16,
  dragonball: 17,
  drill: 33,
  flamethrower: 44,
  blowtorch: 32,
  shotgun: 11,
  handgun: 12,
  uzi: 13,
  minigun: 14,
  prod: 20,
  dynamite: 21,
  mine: 22,
  airstrike: 27,
  napalmstrike: 28,
  postal: 29,
  sheep: 23,
  supersheep: 24,
  aquasheep: 25,
  minestrike: 30,
  molesquadron: 31,
  superbanana: 42,
  mingvase: 49,
  carpetbomb: 51,
  sheepstrike: 50,
  donkey: 54,
  oldwoman: 53,
  bat: 35,
  holy: 43,
  scales: 41,
  sheeplauncher: 5,
  earthquake: 10,
  nuclearbomb: 55,
  armageddon: 56,
  longbow: 15,
  kamikaze: 18,
  suicidebomber: 19,
  molebomb: 26,
  mbbomb: 46,
  sallyarmy: 45,
  skunk: 48,
  madcow: 52,
  napalm: 47,
});

// Team handler 004E6810 counter block and countdown 004E6630.
// This ports arithmetic only, not the original event routing or notifications.
export function advanceNativeDelays(previousTurns, initial, bypass = false) {
  const turns = bypass ? previousTurns | 0 : (previousTurns + 1) | 0;
  const delays = Array.from({ length: 71 }, (_, i) => initial[i] | 0);
  let unlocked = false;
  if (turns > 1) {
    for (let i = 1; i < 71; i++) {
      if (delays[i] > 0) {
        delays[i]--;
        if (delays[i] === 0) unlocked = true;
      }
    }
  }
  return { turns, delays, unlocked };
}

export function createWeaponDelays(config = {}) {
  const delays = Array(71).fill(0);
  for (const [kind, slot] of Object.entries(WEAPON_SLOTS))
    delays[slot] = config[kind] | 0;
  return { turns: 0, delays, unlocked: false };
}
export const weaponDelay = (state, kind) =>
  state?.delays[WEAPON_SLOTS[kind]] ?? 0;
