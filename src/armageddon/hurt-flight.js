import {
  nativeSimpleBodyTick,
  nativeBodyAwake,
  nativeSimpleBounce,
} from "./motion.js";
import { nativeWormHurtCollision } from "./hurt-contact.js";
import { nativeWormReceiver } from "./worm-receiver.js";
import { nativeWormState, nativeWormCollisionType } from "./worm-collision-type.js";
import { nativeHurtEntry } from "./hurt-entry.js";
import schemes from "./scheme-runtime-data.json" with { type: "json" };
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
  const x = fixed(worm.x),
    y = fixed(height - worm.y);
  const body = {
    x,
    y,
    vx: fixed(worm.vx / 50),
    vy: fixed(-worm.vy / 50),
    angle: worm.originalHurt.angle,
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
    restitutionX: 0x9999,
    restitutionY: 0,
    tangent: Math.trunc((byte(0x11ba0) << 16) / 100),
    waterDrag:
      Math.trunc((Math.trunc(((x + y) | 0) / 256) & 65535) / 20) + 0xc000,
    skimScale: 0x20000,
    complex: 1,
    state: worm.originalHurt.state,
    type: nativeWormCollisionType(worm.originalHurt.state),
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
  worm.nativeHurtBody = body;
  worm.nativeFlight = null;
  return body;
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
    {
      awake: nativeBodyAwake,
      collide: collision,
      bounce: (body, hit, side) => {
        const other = environment.collisionBody?.(hit) ?? {
          type: 1,
          vx: 0,
          vy: 0,
        };
        const probe = (x, y) => collision(x, y, body);
        if (![0x7f, 0x80, 0x81].includes(body.state)) {
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
            if (!receiver.worm) return false;
            const contact = nativeWormReceiver(receiver, incoming, side, {
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
    },
  );
  if (body.state === 0x7f && !nativeBodyAwake(body)) {
    body.state = 0x76;
    events.push({ operation: "state", target: 0x76, previous: 0x7f });
  } else if ([0x80, 0x81].includes(body.state) && !nativeBodyAwake(body)) {
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
  worm.knocked = !worm.ground;
  if (worm.originalHurt) {
    worm.originalHurt.angle = body.angle;
    worm.originalHurt.angularVelocity = body.angularVelocity;
  }
  return { body, events, fallDamage: 0 };
}
