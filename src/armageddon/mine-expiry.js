// 0049CA90 seeds five live entries and one dud.004EA200 draws without
// replacement, swaps the last entry into the hole, then refills in draw order.
export class NativeMineDudPool {
  constructor(remaining = [0, 0, 0, 0, 0, 1], used = []) {
    this.remaining = [...remaining];
    this.used = [...used];
  }
  draw(random) {
    if (!this.remaining.length)
      throw new RangeError("Empty native mine dud pool");
    const index = (random() & 0xffff) % this.remaining.length;
    const value = this.remaining[index];
    this.used.push(value);
    const last = this.remaining.pop();
    if (index < this.remaining.length) this.remaining[index] = last;
    if (!this.remaining.length) {
      this.remaining = this.used;
      this.used = [];
    }
    return value;
  }
}

// 004EA200..004EA499: consume the dud draw even for player-placed mines.
export function nativeMineExpiry(previous, environment, pool, hooks) {
  const body = { ...previous },
    calls = [];
  const selected = pool.draw(hooks.logic);
  let near = false;
  if (!body.forceBlast) {
    const radius = (Math.imul(body.damage, 2) + 10) | 0;
    calls.push({ operation: "proximity", request: [radius] });
    near = hooks.proximity(radius);
  }
  const { x, y, dudsEnabled } = environment;
  if (body.forceBlast || !near || !dudsEnabled || !selected || body.placed) {
    calls.push({
      operation: "blast",
      request: [1, x, (y + 0x100000) | 0, 100, body.damage, 0],
    });
    calls.push({ operation: "delete", request: [1] });
  } else {
    body.fuse = body.triggered = body.radius = 0;
    body.dud = 1;
    calls.push({ operation: "sound", request: [90, 5, 0x20000, 65536, 0] });
    for (let i = 0; i < 10; i++) {
      const vx = (hooks.visual() & 0xffff) - 0x8000;
      const vy = (hooks.visual() & 0xffff) - 0x8000;
      const step = Math.trunc((hooks.visual() & 0xffff) / 200) + 0x20c;
      calls.push({
        operation: "smoke",
        request: [0x8ff00, x, y, vx, vy, 0x336, step],
      });
    }
  }
  return { body, calls };
}
