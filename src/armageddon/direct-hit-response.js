// 004D97F0 event 0x433, kinds 0..9. The caller supplies post-base-impulse
// velocity. Voice cooldown/allocation and state-entry side effects remain adapters.
export function nativeDirectHitResponse(body, packet, delay, factor = 1) {
  const [kind, x, y, , , rawDamage] = packet;
  if (kind < 0 || kind > 9) throw new RangeError("Unported direct-hit kind");
  const next = Object.fromEntries(
    [
      "state",
      "vx",
      "vy",
      "accumulated",
      "seen",
      "kind6",
      "delay",
      "kind1",
      "hits",
    ].map((key) => [key, body[key] ?? 0]),
  );
  const output = [];
  if (next.state === 0x88) {
    output.push({ sound: [0x6a, 65536, 65536, 0] }, { base: true });
    next.vx = 0;
    return { result: next, output };
  }
  if (next.seen) return { result: next, output };
  next.seen = 1;
  if (kind === 6) next.kind6 = 1;
  if ([0x84, 0x85, 0x87, 0x6d, 0x75].includes(next.state))
    return { result: next, output };
  output.push({ base: true });
  next.accumulated = (next.accumulated + rawDamage) | 0;
  let damage = rawDamage;
  if ([0, 4, 5, 6, 8].includes(kind)) next.delay = delay & 255;
  if (kind === 1) next.kind1 = 65536;
  if (kind === 2 || kind === 7) {
    damage = Math.trunc(damage / ((next.hits + 1) | 0)) | 0;
    next.hits = (next.hits + 1) | 0;
  }
  if (!body.fieldB0) {
    next.state = kind === 1 ? 0x7f : kind === 9 ? 0x81 : 0x80;
    output.push({ state: next.state });
  }
  if (damage) {
    if (body.fieldB0) damage = (Math.trunc(damage / 2) + 1) | 0;
    output.push(
      { blood: [body.x, body.y, x, y, damage] },
      { health: [damage, 0, factor] },
    );
  }
  return { result: next, output };
}
