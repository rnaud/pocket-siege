// 004F4D80: horizontal position attempt with an integer-pixel slope search.
// Coordinates and displacement are signed16.16, native Y points downward.
// A drop with no support moves X only; falling physics owns the subsequent Y.
export function nativeWalkPosition(x, y, dx, limit, collide) {
  const nextX = (x + dx) | 0;
  let nextY = y;
  if (collide(nextX, nextY)) {
    for (let step = 0; step < limit; step++) {
      nextY = (nextY - 65536) | 0;
      if (!collide(nextX, nextY)) return { x: nextX, y: nextY, result: 1 };
    }
    return { x, y, result: 0 };
  }
  for (let step = 0; step < limit; step++) {
    if (collide(nextX, (nextY + 65536) | 0)) return { x: nextX, y: nextY, result: 1 };
    nextY = (nextY + 65536) | 0;
  }
  return { x: nextX, y, result: -1 };
}

// Original table0056F718: cumulative displacement within a walking cycle.
const stride = [32768,65536,98304,131072,229376,344064,442368,524288,
  540672,557056,573440,589824,589824,589824,589824];
// 004DC860. State entry, animation writes, bungee activation and audio are
// explicit effects; the shared position solver executes against real collision.
export function nativeWalkingStep(input, direction, sprite, soundHandle, collide) {
  const body = { ...input }, calls = [];
  const state = next => { body.state = next; calls.push({ operation: "state", target: next }); };
  const sound = id => {
    if (body.soundHandle) calls.push({ operation: "stopSound", handle: body.soundHandle });
    calls.push({ operation: "sound", request: [id,3,65536,65536,0] });
    body.soundHandle = soundHandle;
  };
  if (body.state !== 0x66 || body.facing !== direction) {
    body.cycle = -1; body.progress = 0; body.anchorX = body.x;
  }
  body.facing = direction;
  if (body.locked) return { body, calls };
  const originalX = body.x;
  let attempt = nativeWalkPosition(body.x, body.y,
    (Math.imul(stride[((body.progress & 65535) * 15) >> 16], direction) - body.x + body.anchorX) | 0,
    8, collide);
  let result = attempt.result;
  if (result === -1) {
    attempt = nativeWalkPosition(originalX, attempt.y, direction << 16, 8, collide);
    if (attempt.result === -1) state(0x7e);
    else result = 1;
  }
  const next = result === 1 ? 0x66 : 0x65;
  if (body.state !== next) state(next);
  body.x = attempt.x; body.y = attempt.y;
  calls.push({ operation: "position", x: body.x, y: body.y });
  body.field19c = 1;
  if (result === -1) calls.push({ operation: "bungeeCheck" });
  if (body.state === 0x66 && sprite === 0x20) {
    const progress = (body.progress + 0xf5c) | 0;
    if ((body.progress & 65535) <= 0x8000 && (progress & 65535) > 0x8000) sound(47);
    body.progress = progress;
    calls.push({ operation: "progress", value: progress });
    if ((progress >> 16) !== body.cycle) {
      sound(48); body.anchorX = body.x; body.cycle = progress >> 16;
    }
  }
  return { body, calls };
}
