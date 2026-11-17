// 004E6810 event42B. Indices are one-based; zero means no living worm.
// 004E5A50's subsequent activation, audio and resource cleanup remain a
// selection interface, not part of this roster search.
export function nativeWormRotation({ health, previous, blocked = 0, matching = true }) {
  const calls = [];
  let selected = previous;
  if (matching) {
    if (blocked) {
      blocked = 0;
      calls.push({ operation: 'event', event: 0x449 });
    }
    calls.push({ operation: 'count' });
    let candidate = previous, found = false;
    for (let i = 0; i < health.length; i++) {
      candidate = (candidate + 1) | 0;
      if (candidate > health.length) candidate = 1;
      calls.push({ operation: 'health', worm: candidate });
      if (health[candidate - 1] > 0) { found = true; break; }
    }
    selected = found ? candidate : 0;
    calls.push({ operation: 'select', worm: selected });
  }
  return { selected, blocked, calls };
}
