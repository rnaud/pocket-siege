// 004F7DA0: dispatch 0x433 to each eligible body in registry order.
// 'direct' skips the shooter and bodies whose virtual +0xF4 returns nonzero;
// ordinary area damage includes the shooter, reverses its impulse and falls off.
export function nativeAreaDamage(bodies, request) {
  const [
    x,
    y,
    extentX,
    extentY,
    damage,
    vx,
    vy,
    kind,
    sound,
    sprite,
    mask,
    direct,
  ] = request;
  const output = [],
    types = mask & ~2;
  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    if (!(types & (1 << (body.type & 31)))) continue;
    if (direct && (body.self || body.blocked)) continue;
    const dx = Math.abs((x - body.x) | 0) | 0,
      dy = Math.abs((y - body.y) | 0) | 0;
    if (dx >= extentX || dy >= extentY) continue;
    let strength = damage;
    if (!direct) {
      const span = (extentX + extentY) >> 16;
      let distance = ((dx + dy) >> 16) - 4;
      if (distance < 4) distance = 0;
      strength = Math.trunc(Math.imul(span - distance, damage) / span);
    }
    const reverse = !direct && body.self;
    output.push({
      body: i,
      event: [0x433, 0x124],
      packet: [
        kind,
        x,
        y,
        reverse ? -vx | 0 : vx,
        reverse ? -vy | 0 : vy,
        strength,
      ],
    });
    if (sound) output.push({ sound: [sound, 3, 65536, 65536, 0] });
    if (sprite)
      output.push({
        effect: [0x80000, x, y, 0, 0, 0, 0, 0, sprite, 0, 65536, 0x1999],
      });
  }
  return output;
}
