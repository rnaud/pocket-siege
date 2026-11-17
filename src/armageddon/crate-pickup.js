// 004F5850..004F596C: preserve registry order and signed32 distance math.
// The worm callers supply32px (004DDABF,004D6D43,004D6ED6,004DE0EE).
export function nativePickupCandidate(actor, candidates, radius, query) {
  for (const candidate of candidates) {
    if (!(0x1800 & (1 << candidate.type)) || candidate === actor) continue;
    if ((Math.abs((actor.x - candidate.x) | 0) | 0) >= radius) continue;
    if ((Math.abs((actor.y - candidate.y) | 0) | 0) >= radius) continue;
    const record = query(candidate);
    if (record && record.kind !== 3) return candidate;
  }
  return null;
}
