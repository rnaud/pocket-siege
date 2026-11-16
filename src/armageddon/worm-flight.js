import { nativeWormJumpLaunch } from "./jump.js";
import { nativeSimpleBodyTick, nativeBodyAwake } from "./motion.js";
import { nativeWormAirborneCollision } from "./worm-contact.js";
const fixed = (value) => Math.round(value * 65536) | 0;

// Browser coordinate adapter around recovered jump/body routines. Call only
// after state 0x77 preparation completes. Native units are pixels per 50 Hz
// tick, y-down. The caller supplies the real collision silhouette and events.
export function attachNativeJumpFlight(
  worm,
  { height, friction = 96 },
  direction,
  backflip = 0,
) {
  const x = fixed(worm.x),
    y = fixed(height - worm.y);
  const sum = (x + y) | 0;
  const body = {
    x,
    y,
    vx: fixed(worm.vx / 50),
    vy: fixed(-worm.vy / 50),
    mass: 65536,
    angularVelocity: 0,
    angle: 0,
    radius: 0x100000,
    enabled: 1,
    suspended: 0,
    sleeping: 0,
    submerged: 0,
    contact: 0,
    moving: 0,
    flags: 0x420cc6,
    gravityScale: 65536,
    windScale: 0,
    drag: 65536,
    restitutionX: 0x9999,
    restitutionY: 0,
    tangent: Math.trunc((friction << 16) / 100),
    waterDrag: Math.trunc((Math.trunc(sum / 256) & 65535) / 20) + 0xc000,
    skimScale: 0x20000,
    complex: 0,
    state: 0x79,
    type: 4,
    facing: worm.facing,
    lastFacingFrame: 0,
    team: (worm.team ?? 0) + 1,
    soundHandle: 0,
    field264: 0,
    field268: 0,
    field26c: 0,
  };
  const launch = nativeWormJumpLaunch(
    65536,
    direction,
    backflip,
    worm.facing,
    body,
  );
  worm.nativeFlight = launch.body;
  worm.ground = false;
  worm.vx = (launch.body.vx / 65536) * 50;
  worm.vy = launch.body.vy ? (-launch.body.vy / 65536) * 50 : 0;
  return launch.impulse;
}

export function stepNativeJumpFlight(
  worm,
  { height, waterLevel, gravityScale = 1, frame = 0, random = () => 0 },
  collide,
) {
  if (!worm.nativeFlight) throw new Error("Native jump flight is not attached");
  const events = [];
  let landingSpeed = 0;
  const collision = (x, y) => collide(x / 65536, height - y / 65536);
  const body = nativeSimpleBodyTick(
    worm.nativeFlight,
    {
      frame,
      index: 0,
      waterY: Math.floor(height - waterLevel),
      gravity: Math.round(0x3d70 * gravityScale),
      wind: 0,
    },
    {
      awake: nativeBodyAwake,
      collide: collision,
      skim: () => events.push({ operation: "skim" }),
      waterChanged: (body) =>
        events.push({ operation: "water", submerged: body.submerged }),
      bounce: (body, hit, side) => {
        // This adapter currently accepts terrain hits only (type 1). Worm/crate
        // receiver callbacks and contact masks must be supplied by a later host.
        const result = nativeWormAirborneCollision(
          body,
          { type: 1, vx: 0, vy: 0 },
          side,
          {
            frame,
            random: side === 1 ? random() : 0,
            voiceId: 0,
            soundHandle: 0,
          },
          collision,
        );
        Object.assign(body, result.body);
        for (const event of result.calls) {
          if (event.operation === "state" && event.target === 0x7a) {
            landingSpeed = Math.max(0, (event.velocity[1] / 65536) * 50);
            // 79 -> 7a common body changes. Animation/audio/scheduler side effects
            // are delivered as events; they are not silently treated as applied.
            body.complex = 1;
            body.type = 2;
            body.drag = 65536;
          }
          events.push(event);
        }
      },
    },
  );
  worm.nativeFlight = body;
  worm.x = body.x / 65536;
  worm.y = height - body.y / 65536;
  worm.vx = (body.vx / 65536) * 50;
  worm.vy = body.vy ? (-body.vy / 65536) * 50 : 0;
  worm.facing = body.facing;
  const landed = events.some(
    (event) => event.operation === "state" && event.target === 0x7a,
  );
  worm.ground = landed;
  // The host resumes its grounded state once the landing event is delivered.
  if (landed) worm.nativeFlight = null;
  return { landed, landingSpeed, events };
}
