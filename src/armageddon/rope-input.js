// Original004DC730: rope/traversal directional input. Native impulses are
// per simulation tick, Y down; rope resizing is four pixels per tick.
export function nativeRopeInput(input, interfaces = {}) {
  const body = { ...input }, calls = [];
  const invoke = (operation, extra) => {
    calls.push({ operation, ...extra });
    return interfaces[operation]?.(body, extra);
  };
  const horizontal = Number(Boolean(body.right)) - Number(Boolean(body.left));
  if (!horizontal) body.moving = 0;
  else {
    const divisor = body.state === 0x7b ? 10 : 20;
    invoke('impulse', { request: [Math.trunc((horizontal << 16) / divisor),
      body.state === 0x7b ? Math.trunc(Math.abs(horizontal) * 65536 / 10) : 0, 0] });
    body.moving = 1;
  }
  if (body.state === 0x7b) {
    if (body.up) invoke('resize', { length: (body.length - 0x40000) | 0 });
    else if (body.down && body.length < Math.imul(body.ropeLength, 65536))
      invoke('resize', { length: (body.length + 0x40000) | 0 });
  } else if (body.up) body.field1f0 = (body.field1f0 - 0xccc) | 0;
  else if (body.down) body.field1f0 = (body.field1f0 + 0xccc) | 0;
  return { body, calls };
}
