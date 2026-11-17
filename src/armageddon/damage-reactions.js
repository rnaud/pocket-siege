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
