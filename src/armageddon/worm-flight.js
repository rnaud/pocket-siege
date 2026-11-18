import { nativeWormPickupContact } from "./worm-pickup.js";
import records from "./scheme-weapons.js";
import { nativeWormTransitionBody } from "./worm-state.js";
import { nativeJetpackInput, nativeJetpackVelocity } from "./jetpack.js";
import { nativeWaterSound } from "./water-audio.js";
import { nativeWormSkim } from "./worm-water.js";
import { nativeContactReceiver } from "./contact-receiver.js";
import { nativeFirePunchEntry, nativeFirePunchTick } from "./fire-punch.js";
import { nativeWormJumpLaunch, nativeBodyImpulse } from "./jump.js";
import { nativeSimpleBodyTick, nativeBodyAwake, nativeSimpleBounce } from "./motion.js";
import { nativeWormAirborneCollision } from "./worm-contact.js";
const fixed = (value) => Math.round(value * 65536) | 0;

// Shared constructor fields for unrestrained airborne worms. State-specific
// entry changes are applied after this common body has been created.
function nativeAirborneBody(worm, height, friction) {
  const x = fixed(worm.x),
    y = fixed(height - worm.y);
  const sum = (x + y) | 0;
  return {
    x,
    y,
    vx: fixed(worm.vx / 50),
    vy: fixed(-worm.vy / 50),
    mass: 65536,
    shape: 3,
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
    restitutionX: worm.nativeSpawnPhysics?.restitutionX ?? 0x9999,
    restitutionY: worm.nativeSpawnPhysics?.restitutionY ?? 0,
    tangent: worm.nativeSpawnPhysics?.tangent ?? Math.trunc((friction << 16) / 100),
    waterDrag: worm.nativeSpawnPhysics?.waterDrag ?? Math.trunc((Math.trunc(sum / 256) & 65535) / 20) + 0xc000,
    skimScale: worm.nativeSpawnPhysics?.skimScale ?? 0x20000,
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
}

// 65 -> 6E retains complex body response and flags;004D7730 changes its
// category to3.004F7490 supplies no launch impulse or suspension change.
export function attachNativeDrillFlight(worm, { height, friction = 96 }) {
  const previous={...nativeAirborneBody(worm,height,friction),state:0x65,type:2,complex:1};
  const body={...nativeWormTransitionBody(previous,0x6e,{}).body,state:0x6e};
  worm.nativeFlight = body;
}

export function stepNativeDrillFlight(worm, environment, collide) {
  const { height, waterLevel, gravityScale = 1, frame = 0 } = environment;
  const collision = (x, y, body) => collide(x / 65536, height - y / 65536, body);
  const body = nativeSimpleBodyTick(worm.nativeFlight, {
    frame, index: environment.index ?? 0,
    waterY: Math.floor(height - waterLevel),
    gravity: Math.round(0x3d70 * gravityScale), wind: 0,
  }, {
    awake: nativeBodyAwake, collide: collision,
    bounce: (body, hit, side) => {
      const other = environment.collisionBody?.(hit) ?? { type:1, vx:0, vy:0 };
      if (nativeWormPickupContact({ ...body, field154: worm.nativePickupFlag ?? body.field154 },
          other.type, () => environment.pickup?.(body) ?? 0)) return;
      const result = nativeWormAirborneCollision(body, other, side, { frame },
        (x,y) => collision(x,y,body),
        (incoming, receiver, side) => {

          // State6E/type3 uses the normal body receiver branch, without
          // the separate airborne stomp or hurt-state voice/attribution path.
          const response = nativeContactReceiver(receiver, incoming, side, {});
          Object.assign(incoming, response.incoming);
          Object.assign(receiver, response.receiver);
          return Boolean(response.result);
        });
      Object.assign(body, result.body);
      environment.updateCollisionBody?.(hit, result.other);
    },
  });
  worm.nativeFlight = body;
  worm.x = body.x / 65536;
  worm.y = height - body.y / 65536;
  worm.vx = body.vx / 65536 * 50;
  worm.vy = -body.vy / 65536 * 50;
  worm.facing = body.facing;
  worm.ground = !nativeBodyAwake(body);
  return body;
}

// 65 -> 6c common transition clears collision flag4, preserves complex bounce,
// and changes category to3. The original entry supplies the launch velocity.
export function attachNativeFirePunchFlight(worm, { height, friction = 96 }, power) {
  const previous={...nativeAirborneBody(worm,height,friction),state:0x65,type:2,complex:1};
  const body={...nativeWormTransitionBody(previous,0x6c,{}).body,state:0x6c};
  const calls = nativeFirePunchEntry(power, body.x, body.y);
  const velocity = calls.find(call => call.operation === "velocity");
  body.vx = velocity.x;
  body.vy = velocity.y;
  worm.nativeFlight = body;
  worm.ground = false;
  worm.vx = body.vx / 65536 * 50;
  worm.vy = -body.vy / 65536 * 50;
  return calls;
}

// 004D7730 enters7D with dragCCCC and weapon39+70 wind sensitivity.
const parachuteWind = records.schemes.find(s => s.resource_id === 195).weapons[39][10];
export function attachNativeFallingFlight(worm, { height, friction = 96 }) {
  const previous = { ...nativeAirborneBody(worm, height, friction), state: 0x65, type: 2, complex: 1 };
  const entry = nativeWormTransitionBody(previous, 0x7e, {});
  worm.nativeFlight = { ...entry.body, state: 0x7e };
  worm.ground = false;
}

export function attachNativeJetpackFlight(worm, { height, friction = 96 }) {
  const previous = worm.nativeFlight ?? {
    ...nativeAirborneBody(worm, height, friction), state: 0x65, type: 2, complex: 1,
  };
  const entry = nativeWormTransitionBody(previous, 0x78, {});
  worm.nativeFlight = { ...entry.body, state: 0x78 };
  worm.ground = false;
}

export function releaseNativeJetpackFlight(worm) {
  if (worm.nativeFlight?.state !== 0x78) return;
  // The host resumes airborne movement after leaving jetpack control.
  const entry = nativeWormTransitionBody(worm.nativeFlight, 0x7e, {});
  worm.nativeFlight = { ...entry.body, state: 0x7e };
}

export function stepNativeJetpackFlight(worm, environment, collide) {
  const body = worm.nativeFlight;
  const input = nativeJetpackInput({ facing: body.facing, side: 0, down: 0 },
    { left: environment.horizontal < 0, right: environment.horizontal > 0, up: environment.vertical > 0 },
    Math.round(0x3d70 * (environment.gravityScale ?? 1)));
  const { result, ...velocity } = nativeBodyImpulse(body, ...input.impulse);
  Object.assign(body, velocity, nativeJetpackVelocity(velocity.vx, velocity.vy), { facing: input.facing });
  return stepNativeJumpFlight(worm, environment, collide);
}

export function attachNativeParachuteFlight(worm, { height, friction = 96, windPercent = parachuteWind }) {
  const previous = worm.nativeFlight ?? worm.nativeHurtBody ?? {
    ...nativeAirborneBody(worm, height, friction), state: 0x7e, type: 3, complex: 1,
  };
  const entry = nativeWormTransitionBody(previous, 0x7d, { weapon70: windPercent });
  worm.nativeFlight = { ...entry.body, state: 0x7d };
  worm.nativeHurtBody = null;
  worm.originalHurt = null;
  worm.knocked = false;
  worm.hurt = 0;
  worm.ground = false;
}

// 004DD020 state7D applies half-gravity directional impulses before motion.
export function stepNativeParachuteFlight(worm, environment, collide) {
  const half = Math.trunc(Math.round(0x3d70 * (environment.gravityScale ?? 1)) / 2);
  const { result, ...velocity } = nativeBodyImpulse(worm.nativeFlight,
    Math.sign(environment.horizontal ?? 0) * half,
    -Math.sign(environment.vertical ?? 0) * half);
  Object.assign(worm.nativeFlight, velocity);
  return stepNativeJumpFlight(worm, environment, collide);
}

// Browser coordinate adapter around recovered jump/body routines. Call only
// after state 0x77 preparation completes. Native units are pixels per 50 Hz
// tick, y-down. The caller supplies the real collision silhouette and events.
export function attachNativeJumpFlight(
  worm,
  { height, friction = 96 },
  direction,
  backflip = 0,
) {
  const body = nativeAirborneBody(worm, height, friction);
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
  environment,
  collide,
) {
  const { height, waterLevel, gravityScale = 1, frame = 0, random = () => 0 } = environment;
  if (!worm.nativeFlight) throw new Error("Native airborne flight is not attached");
  const events = [];
  let landingSpeed = 0;
  const collision = (x, y, body) => collide(x / 65536, height - y / 65536, body);
  const body = nativeSimpleBodyTick(
    worm.nativeFlight,
    {
      frame,
      index: environment.index ?? 0,
      waterY: Math.floor(height - waterLevel),
      gravity: Math.round(0x3d70 * gravityScale),
      wind: Math.round((environment.wind ?? 0) / 2500 * 65536),
    },
    {
      awake: nativeBodyAwake,
      collide: collision,
      skim: body => {
        const result = nativeWormSkim(body, {
          state: (current, next) => {
            const transition = nativeWormTransitionBody(current, next, {});
            Object.assign(current, transition.body);
          },
        });
        Object.assign(body, result.body);
        for (const call of result.calls) events.push({ ...call,
          operation: call.operation === "sound" ? "waterSound" : call.operation });
      },
      waterChanged: body => {
        const request = nativeWaterSound(body).sound;
        if (request) events.push({ operation: "waterSound", request });
      },
      bounce: (body, hit, side) => {
        const other = environment.collisionBody?.(hit) ?? { type: 1, vx: 0, vy: 0 };
        if (nativeWormPickupContact({ ...body, field154: worm.nativePickupFlag ?? body.field154 },
            other.type, () => environment.pickup?.(body) ?? 0)) return;
        const probe = (x, y) => collision(x, y, body);
        if (![0x6c, 0x6e, 0x78, 0x79, 0x7d, 0x7e].includes(body.state)) {
          const response = nativeSimpleBounce(body, other, side, probe);
          Object.assign(body, response.body);
          environment.updateCollisionBody?.(hit, response.other);
          return;
        }
        const previous = body.state;
        const result = nativeWormAirborneCollision(
          body,
          other,
          side,
          {
            frame,
            get random() { return random(); },
            voiceId: 0,
            soundHandle: 0,
          },
          probe,
          (incoming, receiver, side) => {
            if (environment.receive) return environment.receive(incoming, receiver, side, hit);

            const response = nativeContactReceiver(receiver, incoming, side, {});
            for (const call of response.calls) events.push({ ...call, receiverHit: hit });
            Object.assign(incoming, response.incoming);
            Object.assign(receiver, response.receiver);
            return Boolean(response.result);
          },
        );
        Object.assign(body, result.body);
        environment.updateCollisionBody?.(hit, result.other);
        for (const event of result.calls) {
          if (event.operation === "state" && event.target === 0x7a) {
            landingSpeed = Math.max(0, (event.velocity[1] / 65536) * 50);
            // 79 -> 7a common body changes. Animation/audio/scheduler side effects
            // are delivered as events; they are not silently treated as applied.
            const transition=nativeWormTransitionBody({...body,state:previous},0x7a,{});
            Object.assign(body,transition.body,{state:0x7a});
            events.push(...transition.calls);
          }
          events.push(previous === 0x78 && event.operation === "sound"
            ? { ...event, operation: "jetpackContactSound" } : event);
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
  return { landed, landingSpeed, events, body };
}

// Physics precedes the state6C tick. Landing remains in6C until its awake
// getter becomes false; unlike a jump, it must not enter landing state7A.
// The caller dispatches terrain, particles, camera and animation operations.
export function stepNativeFirePunchFlight(worm, environment, collide, sprite, record) {
  const result = stepNativeJumpFlight(worm, environment, collide);
  const body = worm.nativeFlight;
  const calls = nativeFirePunchTick({
    ...body, sprite, motionActive: nativeBodyAwake(body),
  }, record, environment.random ?? (() => 0));
  const finished = calls.some(call => call.operation === "state");
  if (finished) {
    const transition=nativeWormTransitionBody(body,0x6a,{});
    Object.assign(body,transition.body,{state:0x6a});
    result.events.push(...transition.calls);
    worm.ground = true;
    worm.nativeFlight = null;
  }
  return { ...result, calls, finished };
}

// 0x433 reaches the base body's +0x118 impulse method (004F4CB0).
// Browser HP and worm-state transitions remain with the caller.
export function applyNativeWeaponImpulse(worm, x, y) {
  const body = worm.nativeHurtBody ??
    worm.nativeFlight ?? {
      vx: fixed(worm.vx / 50),
      vy: fixed(-worm.vy / 50),
      mass: 65536,
      angularVelocity: 0,
      suspended: 0,
    };
  const { result, ...velocity } = nativeBodyImpulse(body, x, y);
  // Frozen receiver 004D97F0 applies the impulse then clears horizontal speed.
  if (worm.frozen > 0) velocity.vx = 0;
  if (worm.nativeHurtBody) Object.assign(worm.nativeHurtBody, velocity);
  if (worm.nativeFlight) Object.assign(worm.nativeFlight, velocity);
  worm.vx = (velocity.vx / 65536) * 50;
  worm.vy = (-velocity.vy / 65536) * 50;
  return result;
}
