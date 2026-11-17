// 004D97F0 event439 state prefix. Reporting/text follow outside this kernel.
export function nativeWormPoisonInfect(input, amount) {
  if (input.latched || input.state === 0x88) return { ...input };
  return { ...input, amount: (input.amount + amount) | 0, latched: 1 };
}

// Event3EF matches team only, not the collecting worm's index.
export function nativeWormPoisonPickup(input, record) {
  return input.team === record[0] && record[2] === 2
    ? { ...input, amount: 0, latched: 0 } : { ...input };
}

// Event426,004DAEC8..004DAF67. Arguments go to004D8440:
// amount, force=false, uncapped-display=true. Health arithmetic is signed32.
export function nativeWormPoisonDamage(body, hp) {
  if (body.state === 0x88 || !body.amount) return [];
  const target = Math.max(1, (hp - body.amount) | 0);
  return target < hp ? [[(hp - target) | 0, 0, 1]] : [];
}
