// 004B35F0. Event receivers consume the selected team's first record word.
// Preserve cleanup order;004EEA10 clears request counts but not hold timing.
export function nativeDeactivateTurn(input) {
  const body = { ...input, cameraCounts: [...input.cameraCounts] };
  const calls = [0x41f, 0x421, 0x425].map(event =>
    ({ operation: 'event', event, record: [body.activeTeam] }));
  for (const field of ['turnState', 'retreatPending', 'retreatRemaining',
    'activeTeam', 'activeWorm', 'endRequested', 'selectionFlag', 'clockTarget']) body[field] = 0;
  calls.push({ operation: 'cameraPriority', value: 14 });
  body.cameraCap = 14;
  body.cameraCounts.fill(0);
  if (body.endAfterTurn & 255) body.endReason = 4;
  body.inputMode = 0;
  return { body, calls };
}

// 004B6DFF..004B6EDE. The query results are supplied by registry/controller
// interfaces; readiness means continue into team/health settlement gates.
export function nativeSettlementEntry(input) {
  const { matchOver, healthPending, activeMotion, ...initial } = input;
  let body = { ...initial, cameraCounts: [...initial.cameraCounts] };
  const calls = [{ operation: 'busy' }];
  const result = ready => ({ body, calls, ready });
  if (body.busy !== 0) return result(false);
  if (body.activeTeam !== 0) {
    calls.push({ operation: 'matchOver' });
    if (matchOver) {
      calls.push({ operation: 'endActive' });
      const ended = nativeDeactivateTurn(body);
      body = ended.body;
      calls.push(...ended.calls);
      return result(false);
    }
    if (!body.endRequested && !body.retreatPending && !body.retreatRemaining) {
      calls.push({ operation: 'healthPending' });
      if (healthPending) {
        calls.push({ operation: 'activeMotion' });
        if (!activeMotion) {
          calls.push({ operation: 'event', event: 0x41d, record: [body.activeTeam] });
          body.endRequested = 1;
          return result(false);
        }
      }
    }
    if (!body.endRequested) return result(false);
  }
  return result(body.retreatRemaining === 0);
}
