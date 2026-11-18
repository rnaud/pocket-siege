import { nativeWormPickupContact } from "./worm-pickup.js";
import {
  nativeSimpleBodyTick,
  nativeBodyAwake,
  nativeSimpleBounce,
} from "./motion.js";
import { nativeWormHurtCollision } from "./hurt-contact.js";
import { nativeContactReceiver } from "./contact-receiver.js";
import { nativeWormState, nativeWormCollisionType } from "./worm-collision-type.js";
import { nativeHurtEntry } from "./hurt-entry.js";
import { nativeWormSkim } from "./worm-water.js";
import { nativeWaterSound } from "./water-audio.js";
import { nativeProjectileDepth } from "./projectile-lifetime.js";
import { nativeRopeRelease } from "./rope-release.js";
import { nativeWormTransitionBody } from "./worm-state.js";
import schemes from "./scheme-runtime.js";
const scheme = schemes.schemes.find((s) => s.resource_id === 195);
const byte = (address) => scheme.bytes[address - schemes.context_offset];
const fixed = (value) => Math.round(value * 65536) | 0;

export function nativeWormContactBody(worm, height = 0) {
  const body = worm.nativeHurtBody ?? worm.nativeFlight;
  const state = nativeWormState(worm);
  return {
    worm: true,
    type: nativeWormCollisionType(state),
    state,
    x: fixed(worm.x), y: fixed(height - worm.y),
    team: worm.team ?? 0,
    soundHandle: body?.soundHandle ?? 0,
    suspended: body?.suspended ?? 0,
    vx: body?.vx ?? fixed((worm.vx ?? 0) / 50),
    vy: body?.vy ?? fixed(-(worm.vy ?? 0) / 50),
    mass: body?.mass ?? 65536,
    tangent: body?.tangent ?? Math.trunc((byte(0x11ba0) << 16) / 100),
  };
}

export function applyNativeWormContact(worm, body) {
  // State entry must happen before the next sweep query, so the registry
  // stops treating the newly hurt receiver as an ordinary type2 body.
  if (body.state !== undefined && body.state !== nativeWormState(worm)) {
    const entry = nativeHurtEntry(body.state, worm.nativeHurtBody?.angle ?? worm.nativeFlight?.angle ?? 0);
    if (entry) {
      worm.originalHurt = { state: body.state, angle: entry.angle, sprite: entry.calls[1].sprite_id };
      worm.originalRecovery = null;
      worm.ground = false;
      worm.knocked = true;
      worm.hurt = Math.max(worm.hurt ?? 0, 1.4);
      if (worm.nativeHurtBody) {
        worm.nativeHurtBody.state = body.state;
        worm.nativeHurtBody.type = nativeWormCollisionType(body.state);
        worm.nativeHurtBody.angle = entry.angle;
      }
      // Hurt translation owns the body from this point onward.
      worm.nativeFlight = null;
    }
  }
  worm.vx = (body.vx / 65536) * 50;
  worm.vy = (-body.vy / 65536) * 50;
  for (const attached of [worm.nativeHurtBody, worm.nativeFlight])
    if (attached) Object.assign(attached, { vx: body.vx, vy: body.vy });
}

// Constructor fields from 004F4000/004D5A40, entering hurt from ordinary
// unrestrained state. Live collision dispatch supplies native terrain/worm IDs.
export function attachNativeHurtFlight(worm, height) {
  const body = createNativeWormBody(worm, height, worm.originalHurt.state, worm.originalHurt.angle);
  worm.nativeHurtBody = body;
  worm.nativeFlight = null;
  return body;
}

// 004DE81E..004DE858 supplies scheme fall damage before entering state80.
// Keep the moving body's exact position/velocity when handing it to hurt flight.
export function attachNativeFastFall(worm, height) {
  const previous = {
    ...createNativeWormBody(worm, height, nativeWormState(worm), 0),
    ...(worm.nativeHurtBody ?? worm.nativeFlight),
  };
  const entry = nativeWormTransitionBody(previous, 0x80, {});
  worm.nativeHurtBody = { ...entry.body, state: 0x80, angle: 0, damageScale: byte(0x11d40) };
  worm.nativeFlight = null;
  return worm.nativeHurtBody;
}

function createNativeWormBody(worm, height, state, angle) {
  const x = fixed(worm.x),
    y = fixed(height - worm.y);
  const body = {
    x,
    y,
    vx: fixed(worm.vx / 50),
    vy: fixed(-worm.vy / 50),
    angle,
    angularVelocity: 0,
    radius: 0x100000,
    enabled: 1,
    suspended: 0,
    sleeping: 0,
    submerged: 0,
    contact: 0,
    moving: 0,
    gravityScale: 65536,
    windScale: 0,
    drag: 65536,
    flags: 0x420cc6,
    restitutionX: worm.nativeSpawnPhysics?.restitutionX ?? 0x9999,
    restitutionY: worm.nativeSpawnPhysics?.restitutionY ?? 0,
    tangent: worm.nativeSpawnPhysics?.tangent ?? Math.trunc((byte(0x11ba0) << 16) / 100),
    waterDrag: worm.nativeSpawnPhysics?.waterDrag ??
      Math.trunc((Math.trunc(((x + y) | 0) / 256) & 65535) / 20) + 0xc000,
    skimScale: worm.nativeSpawnPhysics?.skimScale ?? 0x20000,
    complex: 1,
    state,
    type: nativeWormCollisionType(state),
    field150: worm.nativeContactMarked ?? 0,
    shape: 3,
    mass: 65536,
    facing: worm.facing,
    lastFacingFrame: 0,
    team: worm.team ?? 0,
    soundHandle: 0,
    field264: 0,
    field268: 0,
    field26c: 0,
    field250: 0,
    maxVx: 0,
    maxVy: 0,
    impact: 0,
    damageScale: 0,
    voiceCooldown: 0,
  };
  return body;
}

// 004D7730 common entry followed by004D80CD: drowning keeps momentum,
// releases constraints and sets the water-only collision flags. The body
// continues004CA320 motion until004DE2DB's world+808 depth cutoff.
export function attachNativeDrowningFlight(worm, height) {
  const input = {
    ...createNativeWormBody(worm, height, worm.frozen ? 0x88 : nativeWormState(worm), 0),
    ...(worm.nativeRopeBody ?? worm.nativeHurtBody ?? worm.nativeFlight),
  };
  const { body } = nativeWormTransitionBody(input, 0x87, {
    soundHandle: 0, weapon70: 0, ropeMode: 0, schemeByte: byte(0x11d40),
  });
  Object.assign(body, {
    x: fixed(worm.x), y: fixed(height - worm.y),
    vx: fixed(worm.vx / 50), vy: fixed(-worm.vy / 50),
    state: 0x87, flags: 0x400000, constrained: 0, segmentCount: 0,
  });
  worm.nativeDrowningBody = body;
  worm.nativeRopeBody = worm.nativeHurtBody = worm.nativeFlight = null;
  return body;
}

export function stepNativeDrowningFlight(worm, { height, waterLevel, frame, gravityScale = 1 }) {
  const body = nativeSimpleBodyTick(worm.nativeDrowningBody, {
    frame, index: 0, waterY: Math.floor(height - waterLevel),
    gravity: Math.round(0x3d70 * gravityScale), wind: 0,
  }, { awake: nativeBodyAwake, collide: () => 0 });
  worm.nativeDrowningBody = body;
  worm.x = body.x / 65536; worm.y = height - body.y / 65536;
  worm.vx = body.vx / 65536 * 50; worm.vy = -body.vy / 65536 * 50;
  return (body.y >> 16) < nativeProjectileDepth(Math.floor(height - waterLevel));
}

// Shared callbacks for released flight and the free part of a rope-skim tick.
export function nativeWormMotionCallbacks(worm, environment, collision, events) {
  const { frame, random = () => 0 } = environment;
  return {
    awake: nativeBodyAwake,
    collide: collision,
    waterChanged: body => {
      const request = nativeWaterSound(body).sound;
      if (request) events.push({ operation: "waterSound", request });
    },
    skim: body => {
      const previous = body.state;
      const result = nativeWormSkim(body, {
        state: (candidate, state) => {
          const entry = nativeWormTransitionBody({ ...candidate, constraint: candidate.constrained }, state,
            { schemeByte: byte(0x11d40) });
          Object.assign(candidate, entry.body, {
            state, constrained: 0, segments: [], constraintHandle: 0,
            damageScale: entry.body.field15c ?? candidate.damageScale,
          });
        },
      });
      Object.assign(body, result.body);
      // Expose the new category before any remaining sweep queries this tick.
      if (worm.nativeRopeBody) worm.nativeRopeBody = body;
      worm.nativeHurtBody = body;
      for (const call of result.calls) events.push({ ...call,
        operation: call.operation === "sound" ? "waterSound" : call.operation, previous });
      environment.onSkim?.(result.worldSkim);
    },
    bounce: (body, hit, side) => {
      const other = environment.collisionBody?.(hit) ?? {
        type: 1,
        vx: 0,
        vy: 0,
      };
      if (nativeWormPickupContact({ ...body, field154: worm.nativePickupFlag ?? body.field154 },
          other.type, () => environment.pickup?.(body) ?? 0)) return;
      const probe = (x, y) => collision(x, y, body);
      if (![0x73, 0x7f, 0x80, 0x81].includes(body.state)) {
        const response = nativeSimpleBounce(body, other, side, probe);
        Object.assign(body, response.body);
        environment.updateCollisionBody?.(hit, response.other);
        return;
      }
      const previous = body.state;
      const response = nativeWormHurtCollision(
        body,
        other,
        side,
        {
          frame,
          get random() {
            return random();
          },
          voiceId: 0,
          soundHandle: 0,
          factor: 1,
          bloodMode: 0,
        },
        probe,
        (incoming, receiver, side) => {

          const contact = nativeContactReceiver(receiver, incoming, side, {
            recordAvailable: true, // Worm event7D3 (004DF270) always succeeds.
            marked: incoming.field150 ?? 0,
            matched: environment.contactOwnerMatches?.(worm) ?? false,
            scale: byte(0x11d6e),
            get random() { return random(); },
            voiceId: 0, soundHandle: 0,
          });
          for (const call of contact.calls)
            events.push({ ...call, receiverHit: hit });
          Object.assign(incoming, contact.incoming);
          Object.assign(receiver, contact.receiver);
          return Boolean(contact.result);
        },
      );
      Object.assign(body, response.body);
      environment.updateCollisionBody?.(hit, response.other);
      for (const call of response.calls) {
        if (call.operation === "state" && call.target === 0x80)
          body.angle = 0;
        events.push({ ...call, previous });
      }
    },
  };
}

export function stepNativeHurtFlight(worm, environment, collide) {
  const {
    height,
    waterLevel,
    frame,
    gravityScale = 1,
    random = () => 0,
  } = environment;
  const input = worm.nativeHurtBody ?? attachNativeHurtFlight(worm, height);
  if (input.voiceCooldown) input.voiceCooldown--;
  if (input.state === 0x7f) input.damageScale = byte(0x11d40);
  const events = [];
  const collision = (x, y, current = input) =>
    collide(x / 65536, height - y / 65536, current);
  const body = nativeSimpleBodyTick(
    input,
    {
      frame,
      index: environment.index ?? 0,
      waterY: Math.floor(height - waterLevel),
      gravity: Math.round(0x3d70 * gravityScale),
      wind: 0,
    },
    nativeWormMotionCallbacks(worm, environment, collision, events),
  );
  if (body.state === 0x7f && !nativeBodyAwake(body)) {
    body.state = 0x76;
    events.push({ operation: "state", target: 0x76, previous: 0x7f });
  } else if ([0x73, 0x80, 0x81].includes(body.state) && !nativeBodyAwake(body)) {
    body.state = 0x65;
    events.push({ operation: "state", target: 0x65 });
  }
  body.type = nativeWormCollisionType(body.state);
  worm.nativeHurtBody = body;
  worm.x = body.x / 65536;
  worm.y = height - body.y / 65536;
  worm.vx = (body.vx / 65536) * 50;
  worm.vy = (-body.vy / 65536) * 50;
  worm.facing = body.facing;
  worm.ground = body.state === 0x76 || body.state === 0x65;
  worm.knocked = body.state !== 0x73 && !worm.ground;
  if (worm.originalHurt) {
    worm.originalHurt.angle = body.angle;
    worm.originalHurt.angularVelocity = body.angularVelocity;
  }
  return { body, events, fallDamage: 0 };
}

export function attachNativeRopeReleaseFlight(worm, rope, height) {
  const released = nativeRopeRelease(rope, rope.angle, byte(0x11d40), (body, state) => {
    const entry = nativeWormTransitionBody({ ...body, constraint: body.constrained }, state,
      { schemeByte: byte(0x11d40) });
    Object.assign(body, entry.body, {
      state, constrained: 0, segments: [], constraintHandle: 0,
      // State73 clears the animation queue, queues sprite18 and sets angle0.
      angle: 0,
    });
  });
  worm.originalHurt = { state: 0x73, angle: 0, sprite: 0x12 };
  const body = attachNativeHurtFlight(worm, height);
  Object.assign(body, released, { damageScale: released.field15c, facing: worm.facing });
  worm.ground = false;
  worm.knocked = false;
  return body;
}
