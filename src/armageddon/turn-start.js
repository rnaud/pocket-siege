// 004B3210. External controller callbacks, worm lookup/position, wind and
// localized announcement dispatch remain interfaces supplied by the caller.
export function nativeTurnStart(input) {
  const body = { ...input.body }, shared = { ...input.shared };
  const calls = [];
  shared.activity = 0;
  body.activeTeam = input.team;
  calls.push({ operation: 'targetEvent', event: 0x42b, team: input.team });
  body.field164 = body.field168 = body.retreatRemaining = body.turnState = body.retreatPending = 0;
  body.turnDuration = body.turnRemaining = (input.schemeTurn & 65535) * 1000;
  body.matchTime = (Math.trunc(((body.matchTime + 999) | 0) / 1000) * 1000) | 0;
  body.retreatDuration = (input.schemeRetreat & 255) * 1000;
  shared.schemeMode = Number((input.schemeMode & 255) === 1);
  calls.push({ operation: 'event', event: 0x41c }, { operation: 'event', event: 0x420 });
  body.activeWorm = input.selectedWorm;
  if (input.state !== 100) {
    calls.push({ operation: 'wormLookup' }, { operation: 'position' });
    body.positionX = input.positionX;
    body.positionY = input.positionY;
  }
  body.panelTarget = body.clockTarget = 65536;
  if (input.state !== 100) {
    calls.push({ operation: 'wormLookup' }, { operation: 'wormRecord' },
      { operation: 'wind', x: input.positionX });
  }
  if (body.matchTime && Math.trunc(body.matchTime / 1000) < 180)
    calls.push({ operation: 'timeWarningText' }, { operation: 'timeWarning' });
  body.selectedTeam = body.lastTeam = input.team;
  body.selectedWorm = body.activeWorm;
  if (input.state === 100) body.turnRemaining = 10000;
  shared.mode = 1;
  shared.rate = 100;
  for (const key of ['cameraHold', 'field1d438', 'field1d43c', 'field1d440', 'field1d444', 'field1d448']) shared[key] = 0;
  body.field1e0 = body.field1e4 = 0;
  body.teamHealth = body.teamHealthCopy = input.teamHealth;
  shared.computerTeam = Number((input.teamControl & 128) !== 0);
  if (!input.initialDeployment) body.turnCount = (body.turnCount + 1) | 0;
  shared.inputMode = input.team;
  calls.push({ operation: 'deploymentPending' });
  if (!input.deployment) body.field204 = 0;
  return { body, shared, teamFlags: (input.teamFlags & 0xffffffe8) >>> 0,
    cachedTeams: 0, cachedHealth: 0, calls };
}
