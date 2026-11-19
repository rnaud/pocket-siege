// Mission script runtime from the turn-game root (vtable 0x526720).
// State mirrors root +0x1f4 (turn), +0x1f8 (timed cursor), +0x1fc (sequence
// cursor), +0x204 (sequence not started) and scene +0x1b90 (forced end code),
// +0x1b8f0/+0x1b8f4 (live Marked crates/targets).
export function createMissionState() {
  return { turn: 0, timedCursor: 0, sequenceCursor: 0, sequencePending: true,
    endCode: 0, markedCrates: 0, markedTargets: 0 };
}

// 004EF8D0 between turns. Executes at most one event; returns whether one ran.
// execute(event) is 004EF6B0: true when handled, false to retry it later.
export function runMissionTimed(state, events, execute) {
  if (events.length <= state.timedCursor) return false;
  while (!state.endCode) {
    const event = events[state.timedCursor];
    if (event.turn < state.turn) {
      if (++state.timedCursor >= events.length) return false;
      continue;
    }
    if (state.turn < event.turn) return false;
    if (!execute(event)) return false;
    // SetEventTurn rewinds the cursor to -1 before this increment.
    state.timedCursor++;
    return true;
  }
  return false;
}

// 004EFA20. execute(step) is 004EF2A0; sequence-only waits follow 004EFAA3.
// limit guards the original's unbounded type-17 loop in the browser.
export function runMissionSequence(state, steps, execute, limit = 4096) {
  let completed = 0;
  if (steps.length <= state.sequenceCursor) return 0;
  while (!state.endCode && limit-- > 0) {
    const step = steps[state.sequenceCursor];
    let done = execute(step);
    if (!done) {
      if (step.type === 15) done = state.markedCrates === 0;
      else if (step.type === 16) done = state.markedTargets === 0;
      else if (step.type === 17) { state.sequenceCursor = -1; done = true; }
      else if (step.type === 18) done = state.turn >= (step.eventTurn | 0);
    }
    if (!done) break;
    state.sequenceCursor++;
    completed++;
    if (state.sequenceCursor >= steps.length) break;
  }
  return completed;
}

// 004409C5: WinningCondition 1/3 use objective mode 3, others mode 2.
export function missionMode(winningCondition) {
  return winningCondition === 1 || winningCondition === 3 ? 3 : 2;
}

// 004B39A0 for mission modes. teams: [{ human, vital, alliance, alive }].
export function missionGameOver(state, mode, teams) {
  if (state.endCode) return true;
  const alliances = filter => new Set(teams.filter(team => team.alive && filter(team)).map(team => team.alliance)).size;
  if (alliances(team => team.human) < 1) return true;
  if (mode === 2) return alliances(team => !team.human && !team.vital) < 1;
  return false;
}

// Frontend 00443FA4..00444078 after the game returns. resultCode is the forced
// end code (4/5) when set, otherwise 3 for an ordinary finish.
export function missionSucceeded({ winningCondition, resultCode, surrendered, teams }) {
  if (surrendered || resultCode === 1 || resultCode === 2) return false;
  if (winningCondition === 0) return !teams.some(team => team.alive && team.alliance !== 0);
  if (winningCondition === 1) return resultCode === 4;
  if (winningCondition === 2) return teams.some(team => team.alive && team.alliance === 0);
  if (winningCondition === 3) return resultCode === 5;
  return false;
}

// 00444000: success upgrades the stored status by attempts (never lowers it).
export function missionMedal(previous, failedAttempts) {
  const earned = failedAttempts === 0 ? 3 : failedAttempts <= 3 ? 2 : 1;
  return Math.max(previous | 0, earned);
}
