import { nativeTryBodyPosition, nativeSimpleBounce } from "./motion.js";

// Ordinary-contact branch of004D6E30 for airborne6c/79/7d/7e, drill6e and jetpack78.
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
    ![0x6c, 0x6e, 0x78, 0x79, 0x7d, 0x7e].includes(input.state) ||
    [0x0b, 0x0c].includes(otherType)
  )
    throw new RangeError("Unsupported worm contact branch");
  const body = { ...input, field264: 0, field268: 0, field26c: 0 };
  const calls = [];
  // Jetpack contact plays the owned landing sample, then dispatches the
  // receiver and normal bounce without entering jump landing state7A.
  if (body.state === 0x78) {
    if (body.soundHandle) calls.push({ operation: "stopSound", handle: body.soundHandle });
    const speed = (Math.abs(body.vx) + Math.abs(body.vy)) | 0;
    calls.push({ operation: "sound", request: [35, 3, 65536, Math.trunc(speed / 10), 0] });
    body.soundHandle = environment.soundHandle;
    return { body, calls, fallback: true };
  }
  // Drill state6E goes directly to receiver dispatch/bounce, without jump
  // landing, ceiling voices, or vertical position-attempt branches.
  if (body.state === 0x6e) return { body, calls, fallback: true };
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

// Completes the ordinary airborne path after the contact decision. External
// receiver and state-entry effects remain interfaces. `respond` follows the
// native receiver +0x28 contract: nonzero handles contact and skips bounce.
export function nativeWormAirborneCollision(
  input,
  otherInput,
  side,
  environment,
  collide,
  respond = () => false,
) {
  const decision = nativeWormAirborneContact(
    input,
    otherInput.type,
    side,
    environment,
    collide,
  );
  const body = decision.body;
  const other = { ...otherInput };
  if (decision.fallback) {
    if (!respond(body, other, side)) {
      const bounced = nativeSimpleBounce(body, other, side, collide);
      Object.assign(body, bounced.body);
      Object.assign(other, bounced.other);
    }
    if (
      ((environment.frame - body.lastFacingFrame) | 0) > 10 &&
      body.state !== 0x79 &&
      body.state !== 0x7d
    ) {
      if (body.vx < -0x6666 || body.vx > 0x6666) {
        body.facing = body.vx < 0 ? -1 : 1;
        body.lastFacingFrame = environment.frame;
      }
    }
  }
  return { ...decision, body, other };
}
