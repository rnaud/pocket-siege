import { nativeSimpleBounce } from "./motion.js";
const abs = (v) => ((v ^ (v >> 31)) - (v >> 31)) | 0;

// 004D6E30 hurt states7f/80/81 and released-rope state73. State entry, health, audio and particles
// are emitted calls. Collision response executes the recovered base bounce.
export function nativeWormHurtCollision(
  input,
  otherInput,
  side,
  environment,
  collide,
  respond = () => false,
) {
  if (![0x73, 0x7f, 0x80, 0x81].includes(input.state))
    throw new RangeError("Unsupported hurt state");
  const body = { ...input, field264: 0, field268: 0, field26c: 0 },
    other = { ...otherInput },
    calls = [];
  const setState = (target) => {
    body.state = target;
    calls.push({ operation: "state", target, velocity: [body.vx, body.vy] });
  };
  const speed = (abs(body.vx) + abs(body.vy)) | 0;
  if (body.state === 0x73) {
    setState(0x80);
    body.field150 = 1;
  }
  body.maxVx = Math.max(body.maxVx, abs(body.vx));
  body.maxVy = Math.max(body.maxVy, abs(body.vy));
  body.impact = Math.min(65536, (body.impact + Math.trunc(abs(speed) / 6)) | 0);
  const vertical =
    (side === 1 || side === 3) && other.type !== 2 ? abs(body.vy) : 0;
  const damage = Math.trunc(
    (Math.imul(body.damageScale, (vertical - 0x70000) | 0) >> 16) / 18,
  );
  if (damage > 0) {
    calls.push({
      operation: "health",
      request: [damage, 0, environment.factor],
    });
    calls.push({
      operation: "particle",
      request: [
        0xe0000,
        body.x,
        (body.y + 0x70000) | 0,
        0,
        0,
        0,
        0,
        0,
        environment.bloodMode ? 0x33e : 0x33d,
        0,
        65536,
        0x1999,
      ],
    });
  }
  if (
    other.type === 1 &&
    body.maxVx < abs(Math.trunc(body.vy / 20)) &&
    body.vy > 0x7ffff
  ) {
    body.field250 = 1;
    body.vx = body.vy = body.angularVelocity = 0;
    setState(0x76);
    return { body, calls, fallback: false, other };
  }
  if (speed > 0x30000 && !body.voiceCooldown) {
    calls.push({ operation: "random" });
    calls.push({
      operation: "voice",
      team: body.team,
      slot: ((environment.random & 255) % 6) + 0x23,
    });
    if (body.soundHandle)
      calls.push({ operation: "stopSound", handle: body.soundHandle });
    calls.push({
      operation: "sound",
      request: [environment.voiceId, 3, 65536, 65536, 0],
    });
    body.soundHandle = environment.soundHandle;
    body.voiceCooldown = 12;
  }
  if (!respond(body, other, side)) {
    const bounced = nativeSimpleBounce(body, other, side, collide);
    Object.assign(body, bounced.body);
    Object.assign(other, bounced.other);
  }
  if (body.state > 0x7e && body.state < 0x82 && side !== 1) {
    const target = abs(body.vx) > 0x4ffff ? 0x80 : 0x7f;
    if (body.state !== target) setState(target);
  }
  if (
    body.state !== 0x79 &&
    body.state !== 0x7d &&
    ((environment.frame - body.lastFacingFrame) | 0) > 10 &&
    (body.vx < -0x6666 || body.vx > 0x6666)
  ) {
    body.facing = body.vx < 0 ? -1 : 1;
    body.lastFacingFrame = environment.frame;
  }
  return { body, calls, fallback: true, other };
}
