const abs = (v) => ((v ^ (v >> 31)) - (v >> 31)) | 0;
const speed = (b) => (abs(b.vx) + abs(b.vy)) | 0;

// 004E2240. Downstream state entry, body response and visual/audio allocation
// are interfaces; preserve the callback's order and signed 32-bit arithmetic.
export function nativeProjectileContact(input, otherType, side, environment) {
  const body = { ...input }, calls = [];
  const original = { x: body.x, y: body.y, vx: body.vx, vy: body.vy };
  const done = () => ({ body, calls });
  const set = (operation, value) => {
    body[operation] = value;
    calls.push({ operation, value });
  };
  const velocity = (vx, vy) => {
    body.vx = vx; body.vy = vy;
    calls.push({ operation: "setVelocity", request: [vx, vy] });
  };
  const detonate = (save) => {
    set("enabled", 0); set("state", 1);
    if (save) { body.impactVx = original.vx; body.impactVy = original.vy; }
    return done();
  };
  const random = () => {
    calls.push({ operation: "random" });
    return environment.random();
  };
  body.impact = (body.impact + Math.trunc(speed(body) / 2)) | 0;
  const hit = (body.hitMask & (1 << (otherType & 31))) !== 0;
  if (body.mode === 4) {
    if (hit || body.armed) return detonate(true);
    if (!body.delay) {
      set("suspended", 1);
      Object.assign(body, { savedX: original.x, savedY: original.y,
        savedVx: original.vx, savedVy: original.vy, field3b4: 0, delay: 10 });
      return done();
    }
  }
  if (hit || body.phase === 2) return detonate(true);
  if (body.mode === 3) {
    const probe = (x, y) => {
      calls.push({ operation: "probe", request: [x, y] });
      return environment.probe(x, y);
    };
    if (!probe(original.x, (original.y + 65536) | 0)) {
      velocity(0, 0);
      return done();
    }
    probe(original.x, original.y);
  }
  const selectedSide = (body.sideMask & (1 << (side & 31))) !== 0;
  if (body.mode === 2 && selectedSide) {
    if (body.count) {
      body.count = (body.count - 1) | 0;
      if (body.count < 1) return detonate(false);
    }
    if ((random() & 1023) % 100 < body.chance) {
      const reversed = -original.vx | 0;
      velocity((reversed + (reversed < 0 ? -abs(original.vy) : abs(original.vy))) | 0, original.vy);
    }
  }
  const beforeResponseVx = body.vx;
  if (body.mode === 2 && body.sound)
    calls.push({ operation: "sound", request: [body.sound, 65536, Math.trunc(speed(body) / 5), 0] });
  calls.push({ operation: "respond", side });
  environment.respond?.(body, side);
  if (body.mode === 2 && selectedSide && body.effect) {
    if (body.sprite === 0x2ab) {
      calls.push({ operation: "specialEffect", request: [body.x, body.y, 12] });
      environment.specialEffect?.([body.x, body.y, 12]);
    }
    calls.push({ operation: "effectRandom", request: [body.effect, body.effectRange] });
    const value = environment.effectRandom(body.effect, body.effectRange);
    calls.push({ operation: "effect", request: [1, body.x, body.y, body.effectKind, value, 0] });
  }
  if (body.mode === 3 && !(random() & 0xf0000000) && (side === 4 || side === 2))
    body.facing = beforeResponseVx < 0 ? -1 : 1;
  return done();
}
