import { nativeDeactivateTurn } from './settlement-entry.js';

// 004B6D05: signed milliseconds, once per 50 Hz simulation tick.
export function nativeRetreatCountdown(remaining) {
  if (!remaining) return 0;
  return Math.max(0, (remaining - 20) | 0);
}

// 004B6C63..004B6DC8. Caller has already selected an active team.
// actionBusy is the registry action-state query, not a velocity test.
export function nativeRetreatTick(input) {
  const { actionBusy, teamStatus, ...initial } = input;
  let body = { ...initial, cameraCounts: [...initial.cameraCounts] };
  const calls = [];
  const result = continued => ({ body, calls, continued });
  if (body.retreatPending) {
    calls.push({ operation: 'actionBusy' });
    if (!actionBusy) {
      body.retreatPending = 0;
      body.turnState = 0;
      body.retreatRemaining = Math.max(1, body.retreatDuration);
      calls.push({ operation: 'targetEvent', type: 0x15, target: body.activeTeam, event: 0x42e, size: 0 });
      calls.push({ operation: 'event', event: 0x424, record: [body.activeTeam] });
      return result(false);
    }
  }
  if (body.retreatRemaining) {
    body.retreatRemaining = nativeRetreatCountdown(body.retreatRemaining);
    if (!body.retreatRemaining) {
      calls.push({ operation: 'event', event: 0x41d, record: [body.activeTeam] });
      body.turnState = 1;
      body.endRequested = 1;
      return result(false);
    }
  }
  if (body.turnState) {
    calls.push({ operation: 'teamStatus' });
    if (!teamStatus) {
      calls.push({ operation: 'wake' }, { operation: 'endActive' });
      body.busy = 12;
      const ended = nativeDeactivateTurn(body);
      body = ended.body;
      calls.push(...ended.calls);
      body.advancePending = 1;
      return result(false);
    }
  }
  return result(true);
}
