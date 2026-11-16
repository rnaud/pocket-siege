import { fixedMultiply } from "./numeric.js";
import { nativeSin, nativeCos } from "./trig.js";
// 004EE1D0 mode 0: two concentric groups, no central impact sprites.
export function nativeSmokeBurst(x, y, strength, random) {
  const count = Math.trunc(strength / 10) + 3;
  const sprite =
    0x330 +
    Math.min(2, strength < 30 ? 0 : strength < 45 ? 1 : strength < 60 ? 2 : 3);
  const requests = [];
  for (const [radiusDivisor, speedDivisor, baseStep] of [
    [60, 30, 0x666],
    [100, 15, 0x3d7],
  ]) {
    const radius = Math.trunc((strength + 5) / radiusDivisor);
    const speed = Math.trunc((strength + 5) / speedDivisor);
    for (let i = 0; i < count; i++) {
      const angle = Math.trunc((i * 65536 + 32768) / count);
      const cos = nativeCos(angle),
        sin = nativeSin(angle);
      requests.push([
        0x80001 + ((i * count) % 32),
        (x + Math.imul(cos, radius)) | 0,
        (y + Math.imul(sin, radius)) | 0,
        Math.imul(cos, speed),
        Math.imul(sin, speed),
        sprite,
        baseStep + Math.trunc((random() & 0xffff) / 100),
      ]);
    }
  }
  return requests;
}
// 004D4F10 constructor payload and constants.
export function nativeSmokeBody([layer, x, y, vx, vy, sprite, step]) {
  return {
    layer,
    x,
    y,
    vx,
    vy,
    sprite,
    step,
    progress: 0,
    damping: 0xf333,
    gravity: -0x2666,
  };
}
// 004D5030: motion RNG is a separate LCG stream at context+0x1241C.
export function nativeSmokeTick(body, random) {
  const next = {
    ...body,
    x: (body.x + body.vx) | 0,
    y: (body.y + body.vy) | 0,
  };
  const rx = random() & 0xffff,
    ry = random() & 0xffff;
  next.vx = fixedMultiply((body.vx - 0x8000 + rx) | 0, body.damping);
  next.vy = fixedMultiply(
    (body.vy + body.gravity + ry - 0x8000) | 0,
    body.damping,
  );
  next.progress = (body.progress + body.step) | 0;
  return { body: next, alive: (next.progress & 0xffff0000) < 0x10000 };
}
// 004DC0BC–004DC10D places smoke every 24 pixels above the name label.
export function nativeDeathSmoke(x, y, nameBytes, random) {
  const width = Math.trunc(nameBytes / 12) + 1;
  const requests = [];
  for (let i = -width; i <= width; i++)
    requests.push(
      ...nativeSmokeBurst(
        (x + i * 0x180000) | 0,
        (y - 0x210000) | 0,
        5,
        random,
      ),
    );
  return requests;
}
