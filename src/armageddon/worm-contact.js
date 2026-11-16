import { nativeTryBodyPosition } from "./motion.js";

// Ordinary-contact branch of 004D6E30 for airborne states 6c/79/7d/7e.
// Stops at the fallback dispatch boundary (004D7357). The caller must apply
// state-entry effects and, when requested, the remaining collision dispatch.
// Incoming crate types 0x0b/0x0c have a separate collection path.
export function nativeWormAirborneContact(
  input,
  otherType,
  side,
  environment,
  collide,
) {
  if (
    ![0x6c, 0x79, 0x7d, 0x7e].includes(input.state) ||
    [0x0b, 0x0c].includes(otherType)
  )
    throw new RangeError("Unsupported worm contact branch");
  const body = { ...input, field264: 0, field268: 0, field26c: 0 };
  const calls = [];
  if (side === 1) {
    if (body.state === 0x79 && otherType === 2)
      return { body, calls, fallback: true };
    body.angularVelocity = body.vx = body.vy = 0;
    calls.push({ operation: "random" });
    calls.push({
      operation: "voice",
      team: body.team,
      slot: ((environment.random & 255) % 3) + 0x26,
    });
    if (body.soundHandle)
      calls.push({ operation: "stopSound", handle: body.soundHandle });
    calls.push({
      operation: "sound",
      request: [environment.voiceId, 3, 65536, 65536, 0],
    });
    body.soundHandle = environment.soundHandle;
    return { body, calls, fallback: false };
  }
  if (side === 3 || body.vy > -65536) {
    const original = { x: body.x, y: body.y };
    const attempt = nativeTryBodyPosition(
      body,
      body.x,
      (body.y + 65536) | 0,
      collide,
    );
    if (!attempt.result) {
      if (body.state !== 0x6c) {
        calls.push({
          operation: "state",
          target: 0x7a,
          velocity: [body.vx, body.vy],
        });
        body.state = 0x7a;
      }
      body.vx = body.vy = body.angularVelocity = 0;
      return { body, calls, fallback: false };
    }
    Object.assign(body, {
      x: attempt.x,
      y: attempt.y,
      sleeping: attempt.sleeping,
    });
    const restored = nativeTryBodyPosition(
      body,
      original.x,
      original.y,
      collide,
    );
    Object.assign(body, {
      x: restored.x,
      y: restored.y,
      sleeping: restored.sleeping,
    });
  }
  return { body, calls, fallback: true };
}
