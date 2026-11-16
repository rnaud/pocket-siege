// Original004F8D50 state71 entry. Coordinates are signed16.16, Y down.
// 004FAF90 launch setup and the collision-aware +100 position attempt are
// interfaces; the latter can reject snapping without preventing initialization.
export function nativeBlowtorchEntry(input, record, stats, positionAccepted) {
  const x = input.x & -65536, y = input.y & -65536;
  return {
    body: {
      ...input,
      x: positionAccepted ? x : input.x,
      y: positionAccepted ? y : input.y,
      field1f4: 0, field1f8: 0, field1fc: x, field27c: 0,
      remaining: record['0x7c'] | 0, suspended: 1,
    },
    stats: {
      counter58c: (stats.counter58c + 3) | 0,
      counter590: (stats.counter590 + 5) | 0,
    },
    calls: [
      { operation: 'launchSetup', value: 0 },
      { operation: 'tryPosition', request: [x, y] },
      { operation: 'clear' },
      { operation: 'queue', sprite: 125 },
      { operation: 'suspend', value: 1 },
    ],
  };
}
