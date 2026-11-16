import { fixedMultiply } from "./numeric.js";
// 004EE020. All four visual RNG draws occur even when the 24-body pool is full.
export function nativeDebrisBurst(x, y, speed, count, active, random) {
  const requests = [];
  for (let i = 0; i < count; i++) {
    const vx = fixedMultiply((random() & 65535) - 0x8000, speed);
    const vy = fixedMultiply((random() & 65535) - 0x18000, speed);
    const sprite = (random() & 65535) > 0x7fff ? 0x2f4 : 0x402f4;
    const step = Math.trunc((random() & 65535) / 40) + 0x28f;
    if (active + requests.length < 24)
      requests.push([x, y, vx, vy, sprite, step]);
  }
  return requests;
}
// 004DF8F0 constructor fields.
export function nativeDebrisBody([x, y, vx, vy, sprite, step]) {
  return {
    x,
    y,
    vx,
    vy,
    sprite,
    step,
    progress: 0,
    trail: 0,
    trailStep: Math.imul(step, 15),
  };
}
// 004DFA10, event 0x3ED. Trail RNG uses the same separate stream as smoke.
export function nativeDebrisTick(body, gravity, water, random) {
  const next = {
    ...body,
    x: (body.x + body.vx) | 0,
    y: (body.y + body.vy) | 0,
    vy: (body.vy + gravity) | 0,
    progress: (body.progress + body.step) | 0,
  };
  const smoke = [],
    sounds = [];
  if ((next.progress & 0xffff0000) >= 65536)
    return { body: next, smoke, sounds, alive: false };
  if (next.y >> 16 >= water) {
    sounds.push([0x37, 1, 0x20000, 65536, 0]);
    return { body: next, smoke, sounds, alive: false };
  }
  next.trailStep = Math.trunc(
    ((Math.abs(next.vx) + Math.abs(next.vy)) | 0) / 20,
  );
  next.trail = (next.trail + next.trailStep) | 0;
  while (next.trail > 65535) {
    smoke.push([
      0x80065,
      next.x,
      next.y,
      0,
      0,
      0x336 - (Math.imul(next.progress, 3) >> 16),
      Math.trunc((random() & 65535) / 100) + 0x666,
    ]);
    next.trail = (next.trail - 65536) | 0;
  }
  return { body: next, smoke, sounds, alive: true };
}
