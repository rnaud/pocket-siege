// 004D8260..004D82C3, the tail of worm state entry004D7730.
// Keep unresolved fields named by offset rather than equating them with velocity.
export function nativeActionBusyWrite({ state, field26c, field2e0, busy }) {
  const calls = ['state'];
  const actionBusy = Number((state >= 0x68 && state <= 0x72) ||
    state === 0x74 || state === 0x75 || field26c !== 0 || field2e0 !== 0);
  if (actionBusy) {
    calls.push('state');
    if (state !== 0x74) {
      calls.push('wake');
      busy = 12;
    }
  }
  calls.push('setActionBusy');
  return { actionBusy, busy, calls };
}

// Full004B5D40. Scheme11D5F changes query order, not the final eligibility.
export function nativeActionGate({ schemeFlag, endRequested, retreatPending,
  retreatRemaining, activeTeam, field160, actionBusy }) {
  const calls = [];
  const query = () => { calls.push('actionBusy'); return actionBusy; };
  const result = allowed => ({ allowed, calls });
  const deferred = (schemeFlag & 255) !== 0;
  if (!deferred && query()) return result(false);
  if (endRequested || retreatPending || retreatRemaining || !activeTeam || field160)
    return result(false);
  if (deferred && query()) return result(false);
  return result(true);
}

// 004D9B78..004DB56F, after the worm's3EA tick returns. Unlike state
// entry this can only clear a registry flag; it never sets or wakes it.
export function nativeActionBusyClear({ state, field26c, field2e0, busy, actionBusy, tickResult }) {
  const calls = [];
  if (tickResult) {
    calls.push('state');
    if (!((state >= 0x68 && state <= 0x72) || state === 0x74 || state === 0x75)) {
      calls.push('actionBusy');
      if (actionBusy && !field26c && !field2e0) {
        calls.push('setActionBusy');
        actionBusy = 0;
      }
    }
  }
  return { actionBusy, busy, calls };
}
