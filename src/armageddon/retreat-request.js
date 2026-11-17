// 004B4230. Negative weapon duration resets the accumulator before the
// traversal minimum is applied. Native scheme11D47 is an unsigned byte.
export function nativeRetreatDuration(duration, weaponRetreat, activeTeam, wormState, traversalSeconds) {
  duration = weaponRetreat < 0 ? 0 : Math.max(duration, weaponRetreat);
  if (activeTeam && (wormState === 0x78 || wormState === 0x7b ||
      wormState === 0x7c || wormState === 0x7d))
    duration = Math.max(duration, (traversalSeconds & 255) * 1000);
  return duration;
}

// 004B4CE0 event432. The environment receiver always receives the event,
// including when weapon58 or scheme11D62 suppresses the retreat request.
export function nativeRetreatRequest(input) {
  const { endsTurn, schemeFlag, weaponRetreat, traversalSeconds, wormState, ...initial } = input;
  const body = { ...initial };
  const calls = ['weapon'];
  if (endsTurn && (body.field104 || !(schemeFlag & 255))) {
    body.retreatPending = 1;
    calls.push('weapon');
    if (body.activeTeam) calls.push('wormState', 'traversalState');
    body.retreatDuration = nativeRetreatDuration(body.retreatDuration, weaponRetreat,
      body.activeTeam, wormState, traversalSeconds);
    body.clockTarget = 0;
  }
  calls.push('environmentEvent');
  return { body, calls };
}
