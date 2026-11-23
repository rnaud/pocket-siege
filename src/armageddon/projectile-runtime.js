import { nativeLaunchAudio } from "./launch-audio.js";
import { nativeLaunch } from "./launch.js";
import { nativePlacedFire, nativePlacedPower } from "./placed-fire.js";
import { nativeProjectileDetonation } from "./projectile-detonation.js";
import { nativeProjectileFragments } from "./projectile-fragments.js";
import { nativeProjectilePlacement } from "./projectile-placement.js";
import { nativeWormState } from "./worm-collision-type.js";
import { nativeAirstrikeInitial, nativeAirstrikeTick } from "./airstrike.js";
import { nativeProjectileLifetime, nativeProjectileDepth } from "./projectile-lifetime.js";
import { nativeProjectileArt, nativeProjectileAnimationRate, nativeProjectileAnimationTick } from "./projectile-art.js";
import { nativeHomingSteer, nativeHomingSchedule, nativeHomingAvoid } from "./homing.js";
import { nativeProjectileTimer } from "./projectile-timer.js";
import { nativeProjectileContact } from "./projectile-contact.js";
import { nativeContactReceiver } from "./contact-receiver.js";
import { nativeDamageVariation } from "./hitscan-resolution.js";
import { nativeWaterSound, enqueueNativeSound } from "./water-audio.js";
import records from "./scheme-weapons.js";
import { WEAPON_SLOTS } from "./delays.js";
import {
  nativeProjectileSelection,
  nativeProjectileBody,
} from "./projectile-body.js";
import { nativeLaunchVelocity } from "./power.js";
import { nativeSin, nativeCos } from "./trig.js";
import { nativeSceneCollision } from "./collision-scene.js";
import {
  nativeSimpleBodyTick,
  nativeSimpleBounce,
  nativeBodyAwake,
} from "./motion.js";
const fixed = (value) => Math.round(value * 65536) | 0;
// Fire input004F9FA0 bypasses charging for mode3 records with fixed power.
// Apply the same value to trajectory planning and AI/direct release callers.
function releasePower(record, power) {
  return record['0x68'] === 1 && record['0x70'] === 3 && record['0x78']
    ? Math.trunc((record['0x78'] << 16) / 100) | 0
    : fixed(Math.max(0, Math.min(100, power)) / 100);
}
const kinds = new Set([
  "rocket",
  "homing",
  "pigeon",
  "magic",
  "mortar",
  "grenade",
  "cluster",
  "banana",
  "holy",
  "napalm",
  "dynamite",
  "mine",
  "airstrike",
  "napalmstrike",
  "postal",
  "carpetbomb",
  "sheepstrike",
  "minestrike",
  "superbanana",
  "mingvase",
  "molesquadron",
  "sheep",
  "supersheep",
  "aquasheep",
  "donkey",
  "oldwoman",
  "molebomb",
  "mbbomb",
  "sallyarmy",
  "skunk",
  "madcow",
]);
// Resource 195 is the native loader's default scheme (00470A20). Browser
// presets remain modifiers around this baseline until scheme UI is ported.
const baseline = records.schemes.find((s) => s.resource_id === 195).weapons;
const cache = new Map();
function weaponRecord(kind) {
  if (!kinds.has(kind)) return null;
  if (!cache.has(kind))
    cache.set(
      kind,
      Object.fromEntries(
        baseline[WEAPON_SLOTS[kind]].map((v, i) => [
          "0x" + (0x48 + i * 4).toString(16),
          v,
        ]),
      ),
    );
  return cache.get(kind);
}
export function nativeProjectileLaunch(kind, angle, power) {
  const record = weaponRecord(kind);
  if (!record) return null;
  const turn = Math.round((angle * 65536) / 360);
  const [vx, vy] = nativeLaunchVelocity(
    record,
    nativeCos(turn),
    -nativeSin(turn),
    releasePower(record, power),
  );
  return { vx: (vx / 65536) * 50, vy: (-vy / 65536) * 50 };
}

// Host adapter for the original placed-action lifecycle. Native callbacks
// own release ordering/power and decide when the host may enter retreat.
export function nativePlacedWeaponAction(kind, worm, height, spawn, finish) {
  const record = weaponRecord(kind);
  if (!record || record['0x68'] !== 2) return null;
  const action = nativePlacedFire({
    ...worm.nativePlacedAction,
    weapon: WEAPON_SLOTS[kind], enabled: 1,
    shots: worm.nativePlacedAction?.shots ?? 0,
    field2d8: 1,
  }, record, {
    launchSetup: () => {
      const origin = nativeLaunch(record, {
        x: fixed(worm.x), y: fixed(height - worm.y), angle: 0,
        facing: worm.facing ?? 1,
      });
      return [origin.x, origin.y, origin.vx, origin.vy];
    },
    launch: (body, currentRecord, { request: [x, y, dx, dy] }) => {
      const [vx, vy] = nativeLaunchVelocity(currentRecord, dx, dy, body.power,
        nativeWormState(worm), fixed(-(worm.vy ?? 0) / 50));
      spawn({ x: x / 65536, y: height - y / 65536,
        vx: vx / 65536 * 50, vy: -vy / 65536 * 50 });
    },
    finish: () => finish(),
  });
  worm.nativePlacedAction = action.body;
  return action;
}

export function nativeProjectileLaunchGeometry(kind, worm, angle, power, height, random = () => 0, preview = false) {
  const record = weaponRecord(kind);
  if (!record) return null;
  const radians = angle * Math.PI / 180;
  // Host degrees map to the original facing plus doubled half-turn aim.
  const aim = Math.round((Math.asin(Math.sin(radians)) / Math.PI + 0.5) * 65536);
  const origin = nativeLaunch(record, {
    x: fixed(worm.x), y: fixed(height - worm.y), angle: aim,
    facing: record["0x68"] === 2 ? (worm.facing ?? 1) : Math.cos(radians) < 0 ? -1 : 1, preview, random,
  });
  // 004F9C30 selects placed-weapon power independently of the charge slider.
  const charge = record["0x68"] === 2
    ? nativePlacedPower(record)
    : releasePower(record, power);
  const [vx, vy] = nativeLaunchVelocity(record, origin.vx, origin.vy,
    charge, nativeWormState(worm), fixed(-(worm.vy ?? 0) / 50));
  return { x: origin.x / 65536, y: height - origin.y / 65536,
    vx: vx / 65536 * 50, vy: -vy / 65536 * 50 };
}
export function attachNativeProjectile(p, height) {
  if ((p.nativeWeaponKind ?? p.kind) === "mine") return false;
  const record = weaponRecord(p.nativeWeaponKind ?? p.kind);
  if (!record) return false;
  // Preserve release dispatch separately from per-projectile fuse audio.
  // Repeating weapon action state and casing emission remain separate ports.
  p.nativeRelease = nativeLaunchAudio(record, {
    loop: 0, burst: 0, ordinal: 0, flag: 0, team: p.owner ?? 0,
  });
  const block = Array.from(
    { length: 94 },
    (_, i) => record["0x" + ((p.nativeBlockOffset ?? ((p.nativeWeaponKind ?? p.kind) === "donkey" || (p.nativeWeaponKind ?? p.kind) === "mbbomb" ? 0x88 : 0x74)) + i * 4).toString(16)],
  );
  return attachNativeProjectileBlock(p, height, block);
}

// 94-word projectile block read from a default-scheme weapon entry. Callers
// pass the native entry offset (004EDAD0(slot) + offset), e.g. Armageddon
// meteors use weapon56 + 0x70 in 004EB28E.
export function nativeWeaponSlotBlock(slot, offset) {
  const words = baseline[slot];
  return Array.from({ length: 94 }, (_, i) => words[(offset - 0x48) / 4 + i] ?? 0);
}

// Shared004E1830 constructor adapter for an explicit native projectile block.
// Contents effects supply the original11-word payload without weapon release.
export function attachNativeProjectileBlock(p, height, block, nativePayload = null) {
  const payload = {
    owner: p.owner ?? 0,
    x: fixed(p.x),
    y: fixed(height - p.y),
    vx: fixed(p.vx / 50),
    vy: fixed(-p.vy / 50),
    repeat: p.nativeRepeat ?? 0,
    timer: Math.round(p.fuse * 1000),
    bounce: Math.round(p.bounce * 100),
  };
  if (nativePayload) Object.assign(payload, {
    owner: nativePayload[0], x: nativePayload[2], y: nativePayload[3],
    vx: nativePayload[4], vy: nativePayload[5], repeat: nativePayload[8],
    bounce: nativePayload[9], timer: nativePayload[10],
  });
  const selected = nativeProjectileSelection(block, payload);
  p.nativePlacementFlags = selected.config.flags | 2;
  p.nativeFragmentConfig = {
    count: block[47], speed: block[48], variance: block[49],
    direction: block[50], spread: block[51], mode: block[75],
  };
  p.nativePayload = nativePayload ? [...nativePayload] :
    [payload.owner, 0, payload.x, payload.y, payload.vx, payload.vy,
      0, 0, payload.repeat, payload.bounce, payload.timer];
  p.nativeTrail = { fields: selected.words.slice(8, 12), progress: 0 };
  // Actor +0x2D4.. holds these 42 words (004E1830); unit routines read them.
  p.nativeWords = selected.words;
  // 004E1830 copies the selected block to +0x2D4; word 35 is the 004E3870 gas
  // delay (+0x360) and word 36 its amount (+0x364).
  p.nativeGas = selected.words[35] ? { emitting: 0, delay: selected.words[35], amount: selected.words[36], sunk: false } : null;
  p.nativeBody = nativeProjectileBody(
    {
      // 004E1830 calls 004F4000(context, type15, projectileBlock[0]).
      shape: block[0],
      restitutionY: 0,
      tangent: Math.trunc((96 * 65536) / 100),
      radius: 0x100000,
      waterDrag: 0xcccc,
      skimScale: 65536,
      angle: 0,
      angularVelocity: 0,
      suspended: 0,
      submerged: 0,
      contact: 0,
      moving: 0,
    },
    selected.config,
    payload,
    96,
  );
  // 004E1830 may replace the payload's motion (a mode-4 child jumps from
  // 8 px higher); the host copy must follow, since frames rebuild from it.
  if (selected.config.mode === 4) {
    p.x = p.nativeBody.x / 65536;
    p.y = height - p.nativeBody.y / 65536;
    p.vx = (p.nativeBody.vx / 65536) * 50;
    p.vy = (-p.nativeBody.vy / 65536) * 50;
  }
  const words = selected.words;
  p.nativeFire = { count: block[47], delay: block[48], lifetime: block[49], persistent: block[50] };
  p.nativeDetonation = {
    offset: words[1], push: words[2], damage: words[3], variance: words[4],
    sprite: words[6], secondary: block[45], repeat: payload.repeat,
  };
  Object.assign(p.nativeBody, {
    type: 15, mode: words[23], hitMask: words[0], sideMask: words[28],
    chance: words[29], sound: words[27], effectKind: words[31],
    effect: words[32], effectRange: words[33], count: words[34],
    sprite: words[6], impact: 0, state: 0, phase: 0, armed: 0, delay: 0,
    impactVx: 0, impactVy: 0,
  });
  p.nativeTimer = {
    remaining: words[17], delay: words[21], delayPlayed: 0,
    waitForRest: words[19], delaySound: words[20], mode: words[23],
    specialSprite: words[38], phase: 0, loopSound: words[18],
    warningPending: 0, warningBlocked: 0, warningScale: 0, state: 0,
  };
  p.nativeFuseSound = words[18];
  p.nativeSecondarySound = words[26];
  if (words[23] === 1) p.nativeGuidance = {
    delay: words[32], duration: words[33], kind: words[31],
    initialized: 0, steerX: 0, steerY: 0,
    owner: p.nativeOwnerId ?? 0,
    primaryTrail: words.slice(8, 12), secondaryTrail: words.slice(27, 31),
    targetX: fixed(p.target?.x ?? p.x),
    targetY: fixed(height - (p.target?.y ?? p.y)),
  };
  p.nativeArt = {
    primary: { sprite: words[6], mode: words[7] },
    secondary: { sprite: words[25], mode: words[26] },
    total: words[17], progress: 0,
    rate: nativeProjectileAnimationRate(payload.x, payload.y),
  };
  updateNativeProjectileArt(p);
  return true;
}

function updateNativeProjectileArt(p) {
  const selected = p.nativeGuidance?.initialized ? p.nativeArt.secondary : p.nativeArt.primary;
  p.nativeRender = nativeProjectileArt({ ...selected,
    remaining: p.nativeTimer.remaining, total: p.nativeArt.total,
    progress: p.nativeArt.progress, angle: p.nativeBody.angle,
    vx: p.nativeBody.vx, vy: p.nativeBody.vy, facing: p.nativeBody.facing,
    override: 0,
  });
  p.nativeArt.progress = p.nativeRender.progress;
}

export function nativeProjectileDetonationEvents(p, random) {
  return nativeProjectileDetonation(p.nativeDetonation, p.nativeBody.x, p.nativeBody.y, random);
}

export function nativeProjectilePlacementHit(p, terrain, worms, height, objects = []) {
  const result = nativeProjectilePlacement({ ...p.nativeBody, flags: p.nativePlacementFlags },
    p.nativeBody.x, p.nativeBody.y, (body, x, y) =>
      nativeSceneCollision(p, body, x / 65536, height - y / 65536, terrain, worms, height, objects));
  p.nativePlacementHit = result.hit;
  return result.hit;
}

export function nativeProjectileChildren(p, height, random, construct = () => {}) {
  if (p.nativeDetonation.secondary !== 1 || p.nativeDetonation.repeat) return [];
  const body = p.nativeBody;
  const children = [];
  nativeProjectileFragments({ ...p.nativeFragmentConfig,
    impactVx: body.impactVx, impactVy: body.impactVy,
    vx: body.vx, vy: body.vy, facing: body.facing,
  }, p.nativePayload, body.x, body.y, random, payload => {
    const child = {
      kind: p.kind === "mortar" ? "shrapnel" : "bomblet",
      nativeWeaponKind: p.nativeWeaponKind ?? p.kind, nativeRepeat: payload[8],
      owner: p.owner, x: payload[2] / 65536, y: height - payload[3] / 65536,
      vx: payload[4] / 65536 * 50, vy: -payload[5] / 65536 * 50,
      fuse: payload[10] / 1000, bounce: payload[9] / 100, age: 0,
    };
    attachNativeProjectile(child, height);
    children.push(child);
    construct(child);
  });
  return children;
}

export function createNativeAirstrike(x, y, direction, owner, height, gravityScale = 1, kind = "airstrike") {
  const record = weaponRecord(kind);
  if (!record || record["0x68"] !== 3) throw new RangeError("Not a native strike weapon");
  const config = {
    count: record["0x74"], spacing: record["0x78"], speed: record["0x7c"],
    kind: record["0x84"], airborne: record["0xc8"], direction: direction << 16,
    targetX: fixed(x), targetY: fixed(height - y),
  };
  return { config, body: nativeAirstrikeInitial(config, Math.round(0x3d70 * gravityScale)),
    owner, kind, sprite: record["0x70"], sound: record["0x80"],
    payload: [owner,0,0,0,direction << 16,0,config.targetX,config.targetY,0,0,0] };
}

export function stepNativeAirstrike(strike, height) {
  const result = nativeAirstrikeTick(strike.body, strike.config, strike.payload);
  strike.body = result.body;
  const mines = result.calls.filter(c => c.operation === "mine").map(({payload}) => ({
    kind: "minestrike", owner: strike.owner,
    x: payload[2] / 65536, y: height - payload[3] / 65536,
    vx: payload[4] / 65536 * 50, vy: -payload[5] / 65536 * 50,
    timer: payload[10],
  }));
  const missiles = result.calls.filter(c => c.operation === "missile").map(({payload}) => {
    const p = { kind: "bomblet", nativeWeaponKind: strike.kind, nativeBlockOffset: 0x88,
      x: payload[2] / 65536, y: height - payload[3] / 65536,
      vx: payload[4] / 65536 * 50, vy: -payload[5] / 65536 * 50,
      owner: strike.owner, fuse: 0, bounce: 0, age: 0 };
    attachNativeProjectile(p,height);
    return p;
  });
  return { missiles, mines, calls: result.calls, removed: result.calls.some(c => c.operation === "delete") };
}

// Owner age is irrelevant to the original manager: every body overlapping the
// actor's starting position is excluded until its cache is refreshed.
export function nativeProjectileCollision(
  p,
  x,
  y,
  terrain,
  worms,
  height,
  body = p.nativeBody,
  objects = [],
) {
  return nativeSceneCollision(p, body, x, y, terrain, worms, height, objects);
}
export function stepNativeProjectile(
  p,
  {
    height,
    waterLevel,
    wind = 0,
    gravityScale = 1,
    frame = 0,
    depth = nativeProjectileDepth(Math.floor(height - waterLevel)),
    random = () => 0,
    solid = () => false,
    collisionBody = () => ({ type: 1, vx: 0, vy: 0 }),
    updateCollisionBody = () => {},
  },
  collide,
) {
  const sounds = [], events = [];
  const art = p.nativeGuidance?.initialized ? p.nativeArt.secondary : p.nativeArt.primary;
  p.nativeArt.progress = nativeProjectileAnimationTick(art.mode, p.nativeArt.rate, p.nativeArt.progress);
  const waterSound = (body, skim) => {
    const event = nativeWaterSound(body, skim);
    body.splashSuppress = event.suppress;
    if (event.sound) enqueueNativeSound(sounds, event.sound);
  };
  let firstHit = 0,
    contacts = 0;
  const body = {
    ...p.nativeBody,
    x: fixed(p.x),
    y: fixed(height - p.y),
    vx: fixed(p.vx / 50),
    vy: fixed(-p.vy / 50),
  };
  p.nativeBody = nativeSimpleBodyTick(
    body,
    {
      frame,
      index: 0,
      waterY: Math.floor(height - waterLevel),
      gravity: Math.round(0x3d70 * gravityScale),
      wind: fixed(wind / 2500),
    },
    {
      awake: nativeBodyAwake,
      skim: (body) => waterSound(body, true),
      waterChanged: (body) => waterSound(body, false),
      collide: (x, y, body) => collide(x / 65536, height - y / 65536, body),
      bounce: (body, hit, side) => {
        firstHit ||= hit;
        contacts++;
        const other = collisionBody(hit);
        const response = nativeProjectileContact(body, other.type, side, {
          random,
          effectRandom: (amount, variance) => nativeDamageVariation(amount, variance, random),
          probe: (x, y) => collide(x / 65536, height - y / 65536, body),
          respond: (incoming, contactSide) => {
            {
              const received = nativeContactReceiver(other, incoming, contactSide, {});
              Object.assign(incoming, received.incoming);
              Object.assign(other, received.receiver);
              if (received.result) {
                updateCollisionBody(hit, other);
                return;
              }
            }
            const bounced = nativeSimpleBounce(incoming, other, contactSide,
              (x, y) => collide(x / 65536, height - y / 65536, incoming));
            Object.assign(incoming, bounced.body);
            updateCollisionBody(hit, bounced.other);
          },
        });
        Object.assign(body, response.body);
        events.push(...response.calls);

      },
    },
  );
  const timer = nativeProjectileTimer({ ...p.nativeTimer,
    state: p.nativeBody.state, phase: p.nativeBody.phase,
  }, { submerged: p.nativeBody.submerged, awake: nativeBodyAwake(p.nativeBody), random });
  p.nativeTimer = timer.body;
  p.nativeBody.state = timer.body.state;
  events.push(...timer.calls.map(call => ({ ...call, timer: true })));
  const lifetime = nativeProjectileLifetime({ ...p.nativeBody,
    secondary: p.nativeGuidance?.initialized ?? 0,
  }, { depth, submerged: p.nativeBody.submerged, awake: nativeBodyAwake(p.nativeBody) });
  p.nativeRemoved = lifetime.some(call => call.operation === "delete");
  if (lifetime.some(call => call.operation === "state")) p.nativeBody.state = 1;
  events.push(...lifetime.map(call => ({ ...call, lifetime: true })));
  if (!p.nativeRemoved && p.nativeBody.mode === 1 && p.nativeGuidance) {
    if (p.nativeBody.submerged && (p.nativeBody.hitMask & 0x400000))
      p.nativeBody.mode = 0;
    else {
      const guidance = nativeHomingSchedule({ ...p.nativeGuidance,
        x: p.nativeBody.x, y: p.nativeBody.y,
        vx: p.nativeBody.vx, vy: p.nativeBody.vy,
      }, { steer: body => Object.assign(body, nativeHomingSteer(body)),
        avoid: body => Object.assign(body, nativeHomingAvoid(body, solid)) });
      p.nativeGuidance = guidance.body;
      p.nativeTrail.fields = guidance.body.initialized ? guidance.body.secondaryTrail : guidance.body.primaryTrail;
      p.nativeBody.vx = guidance.body.vx;
      p.nativeBody.vy = guidance.body.vy;
      events.push(...guidance.calls.map(call => ({ ...call, guidance: true })));
    }
  }
  updateNativeProjectileArt(p);
  p.x = p.nativeBody.x / 65536;
  p.y = height - p.nativeBody.y / 65536;
  p.vx = (p.nativeBody.vx / 65536) * 50;
  p.vy = (-p.nativeBody.vy / 65536) * 50;
  return { hit: firstHit, contacts, sounds, events,
    removed: p.nativeRemoved, detonate: !p.nativeRemoved && p.nativeBody.state === 1 };
}
