import records from "./scheme-weapon-data.json" with { type: "json" };
import { WEAPON_SLOTS } from "./delays.js";
const baseline = records.schemes.find(s => s.resource_id === 195).weapons;
export function nativeReactionWeaponFlag(kind) {
  return baseline[WEAPON_SLOTS[kind]]?.[(0x60 - 0x48) / 4] ?? 0;
}
// Event0x431 blocks004B5350..004B5361 and004B53B4..004B53C5.
export function nativeReactionWeaponUse(state, flag) {
  if (flag) state.usedWeapon = state.shot = 1;
}

// 004B43D0: one reaction wins; transient flags clear even when no voice plays.
const transient = ['kills', 'damage', 'shot', 'perfectTeam', 'amazingTeam',
  'excellentTeam', 'brilliantTeam', 'revengeTeam', 'friendlyTeam', 'selfTeam',
  'fatality', 'maxDamage', 'maxVictimTeam'];
export function nativeDamageReactionVoice(input, options) {
  const state = { ...input }, statistics = [];
  const { sourceTeam, sourceWorm, turnTeam, usedWeapon, teamAlive, nearbyTeam, nextRandom } = options;
  if (sourceTeam && state.shot) {
    statistics.push(['shots', 1]);
    if (!state.damage) statistics.push(['misses', 1]);
    statistics.push(['maxShotKills', state.kills], ['maxShotDamage', state.damage]);
  }
  let speech = null, handled = 1;
  const say = (team, slot) => { speech = { team, request: [slot, 8, 65536, 65536, 0] }; };
  if (state.selfTeam) {
    let speaker = nearbyTeam(state.selfTeam) || state.selfTeam;
    if (teamAlive(state.selfTeam) && usedWeapon) {
      const choice = (nextRandom() >>> 16) % 3;
      if (choice === 2) speaker = state.selfTeam;
      say(speaker, [47, 34, 4][choice]);
    }
  } else if (!state.firstBlood && state.damage && turnTeam) {
    say(turnTeam, 16); state.firstBlood = 1;
  } else if (state.friendlyTeam && teamAlive(state.friendlyTeam)) say(state.friendlyTeam, 49);
  else if (state.perfectTeam) say(state.perfectTeam, 44);
  else if (state.amazingTeam) say(state.amazingTeam, 1);
  else if (state.excellentTeam) say(state.excellentTeam, 12);
  else if (state.brilliantTeam) say(state.brilliantTeam, 3);
  else if (state.revengeTeam && teamAlive(state.revengeTeam)) say(state.revengeTeam, 45);
  else if (state.fatality && sourceTeam) say(sourceTeam, 13);
  else if (state.damage && state.maxVictimTeam && teamAlive(state.maxVictimTeam))
    say(state.maxVictimTeam, [23, 27, 56][(nextRandom() >>> 16) % 3]);
  else if (!state.damage && state.shot && turnTeam) {
    const speaker = nearbyTeam(turnTeam) || turnTeam;
    if (nextRandom() & 65536) say(speaker, 31);
    else say(turnTeam, 41);
  } else handled = 0;
  for (const field of transient) state[field] = 0;
  return { state, handled, speech, statistics };
}

// 004B4CE0 event0x405 (blast quality) and0x3F3 (worm exits playfield).
export function nativeDamageReactionEvent(state, sourceTeam, event, value = 0) {
  if (!sourceTeam) return;
  if (event === 0x3f3) state.fatality = 1;
  else if (event === 0x405) {
    if (value >= 100) state.perfectTeam = sourceTeam;
    else if (value >= 80) state.amazingTeam = sourceTeam;
    else if (value >= 65) state.excellentTeam = sourceTeam;
    else if (value >= 50) state.brilliantTeam = sourceTeam;
  }
}

// 004B4CE0 event0x42C runs reactions after forwarding health reveal, then
// closes the first-blood window even if another reaction won or none played.
export function nativeDamageRevealReaction(input, options) {
  const { state, speech, statistics } = nativeDamageReactionVoice(input, options);
  state.firstBlood = 1;
  return { state, speech, statistics };
}
