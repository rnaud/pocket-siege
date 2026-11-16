// 004D97F0 event0x404. Base blast calculation/impulse is supplied separately;
// fieldB0 is read by original virtual+0xEC, not assumed to mean grounded.
export function nativeBlastResponse(
  body,
  damage,
  probe = false,
  factor = 1,
  impact = [0, 0],
) {
  const next = {
    state: body.state,
    vx: body.vx,
    vy: body.vy,
    accumulated: body.accumulated,
    facing: body.facing,
  };
  const output = [];
  if ([0x84, 0x85, 0x87, 0x6d, 0x75].includes(body.state))
    return { result: next, output };
  const setState = (state) => {
    next.state = state;
    output.push({ state });
  };
  if (body.state === 0x88) {
    output.push({ base: true });
    next.vx = 0;
    return { result: next, output };
  }
  if (body.state === 0x6f) setState(0x80);
  output.push({ base: true });
  if (probe) setState(0x73);
  if (damage) {
    next.accumulated = (next.accumulated + damage) | 0;
    if (body.fieldB0) damage = (Math.trunc(damage / 2) + 1) | 0;
    output.push(
      { blood: [body.x ?? 0, body.y ?? 0, ...impact, damage] },
      { health: [damage, 0, factor] },
    );
    if (!body.fieldB0) {
      const speed = (Math.abs(next.vx) + Math.abs(next.vy)) | 0;
      setState(speed < 0x70000 ? 0x80 : 0x81);
      if (next.vx < -0x6666) next.facing = -1;
      if (next.vx > 0x6666) next.facing = 1;
    }
  }
  return { result: next, output };
}
