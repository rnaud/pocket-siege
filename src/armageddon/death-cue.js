// 004EC060: scan team/worm order, dispatch death to the leftmost zero-HP body.
// Retired state0x89 is excluded; equal coordinates retain the first candidate.
export function nativeNextDeath(teams) {
  let selected = null;
  for (let team = 0; team < teams.length; team++)
    for (let worm = 0; worm < teams[team].length; worm++) {
      const body = teams[team][worm];
      if (body.hp !== 0 || body.state === 0x89) continue;
      if (!selected || (body.x | 0) < selected.x)
        selected = { x: body.x | 0, target: ((team + 1) * 16 + worm + 1) | 0 };
    }
  return selected ? { type: 2, target: selected.target, event: 0x428, size: 0x124 } : null;
}

// 004D8030..004D806F, after common state preparation.
export function nativeDeathEntry(input) {
  return { body: { ...input, spoken: 0, vx: 0, vy: 0, angularVelocity: 0, suspended: 1 },
    calls: [{ operation: 'clear' }, { operation: 'queue', sprite_id: 10, progress: 0 }] };
}

// 004DE582–004DE5F6: state 0x84, original sprite 10. RNG is consumed only
// when the one-shot voice cue becomes due. Team sound lookup is external.
export function nativeDeathCue(sprite, progress, spoken, random) {
  let sound = null,
    randomCalls = 0;
  if (sprite !== 10) return { spoken, sound, randomCalls, complete: false };
  if (progress >= 0x435e && spoken === 0) {
    const value = random();
    randomCalls++;
    sound = [value & 0x10000 ? 6 : 0x21, 3, 0x10000, 0x10000, 0];
    spoken = (spoken + 1) | 0;
  }
  return {
    spoken,
    sound,
    randomCalls,
    complete: (progress & 0xffff0000) >= 0x10000,
  };
}
