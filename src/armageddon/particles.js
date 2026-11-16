// 004E15D0: twelve-word particles, capacity 64, fixed-point integration and
// swap-last retirement. Layout follows the stored object, not the event packet.
export function addNativeParticle(pool, particle) {
  if (pool.length >= 64) return false;
  pool.push({ ...particle });
  return true;
}
export function stepNativeParticles(pool) {
  for (const p of pool) {
    p.progress = (p.progress + p.step) | 0;
    p.x = (p.x + p.vx) | 0;
    p.y = (p.y + p.vy) | 0;
    p.vx = (p.vx + p.ax) | 0;
    p.vy = (p.vy + p.ay) | 0;
  }
  let i = 0;
  const removed = [];
  while (i < pool.length) {
    if (pool[i].progress < pool[i].end) i++;
    else {
      removed.push(pool[i]);
      const last = pool.pop();
      if (i < pool.length) pool[i] = last;
    }
  }
  return removed;
}

// 004E15D0 event 0x43E copies the packet into the native particle layout.
export function nativeParticleRequest(request) {
  const [layer, x, y, rotation, vx, vy, ax, ay, sprite, progress, end, step] =
    request;
  return {
    layer,
    x,
    y,
    rotation,
    vx,
    vy,
    ax,
    ay,
    sprite: sprite & 0xffff,
    mirror: !!(sprite & 0x40000),
    progress,
    end,
    step,
  };
}
