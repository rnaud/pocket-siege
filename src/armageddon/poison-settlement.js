// 004B7279..004B72E1, after kill-announcement and settlement gates.
// Event400 has a 0x124-byte record whose contents are not consumed here.
export function nativePoisonSettlement(input) {
  const body = { ...input, selectedTeam: 0, selectedWorm: 0, mode: 1 };
  const calls = [{ event: 0x400, size: 0x124 }];
  if (body.poisonPending !== 0) {
    calls.push({ event: 0x426, size: 0 });
    body.poisonPending = 0;
    return { body, calls, ready: false };
  }
  return { body, calls, ready: true };
}
