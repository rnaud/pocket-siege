import records from './scheme-weapon-data.json' with { type: 'json' };
import { nativeTraversalFire } from './traversal-fire.js';
import { nativeRopeShotTick } from './rope-shot.js';
import { nativeRopeConstraint } from './rope-constraint.js';
import { nativeHitscanTerrain } from './hitscan-terrain.js';
import { nativeTryBodyPosition, nativeBodyAwake } from './motion.js';
import { nativeRopeBodyTick } from './rope-tick.js';
import { nativeRopeInput } from './rope-input.js';
import { nativeRopeLength } from './rope-length.js';
import { nativeRopeContact } from './rope-contact.js';
import { nativeBodyImpulse } from './jump.js';
import { nativeWormTransitionBody } from './worm-state.js';
import { nativeRopeAnimation } from './rope-animation.js';
import { nativeFireInput } from './fire-input.js';
import { nativeSin, nativeCos } from './trig.js';

const words = records.schemes.find(s => s.resource_id === 195).weapons[37];
const record = Object.fromEntries(words.map((v, i) => ['0x' + (0x48 + i * 4).toString(16), v]));
const fixed = value => Math.round(value * 65536) | 0;

export function refireNativeRope(body) {
  // State73 retains the release angle and remaining shots. Original fire
  // dispatch owns the gate and reset; continuing an active action keeps ammo.
  return nativeFireInput(body, record, { weaponRecord: () => record }).body;
}

export function createNativeRopeShot(worm, angle, height) {
  const radians = angle * Math.PI / 180;
  const positionSum = (fixed(worm.x) + fixed(height - worm.y)) | 0;
  return nativeTraversalFire({
    state: 0x70, weapon: 37, enabled: 1, facing: worm.facing ?? 1,
    aim: Math.round((Math.asin(Math.sin(radians)) / Math.PI + 0.5) * 65536),
    x: fixed(worm.x), y: fixed(height - worm.y), vx: 0, vy: 0,
    shape: 3, flags: 0x420cc6, sleeping: 0, field104: 1, field108: 0,
    constrained: 0, ropeActive: 0, ropeFiring: 0, ropeRemaining: 0,
    shots: 0, shotLimit: 1, field2a4: 1, field2a8: 1,
    team: worm.team, worm: worm.id ?? 0,
    // Base004F4000 and worm004D5A40 numeric setup; attachment applies scheme mode.
    suspended: 0, mass: 65536, gravityScale: 65536,
    ropeFriction: 0xfeb8, ropeBounce: 0x9999, angleDamping: 0x3ae1,
    waterDrag: Math.trunc((Math.trunc(positionSum / 256) & 65535) / 20) + 0xc000,
    skimScale: 0x20000, submerged: 0, contact: 0, moving: 0,
    angularVelocity: 0, field154: 0, field2ec: 0, soundHandle: 0,
  }, record, { weaponRecord: () => record }).body;
}

// Called at the host's fixed50Hz tick. Preserve native segment and velocity
// state between ticks rather than reconstructing it from floating positions.
export function stepNativeRopeSwing(input, controls, environment, interfaces) {
  const attempt = (x, y, candidate) => {
    const result = nativeTryBodyPosition(candidate, x, y,
      (px, py) => interfaces.collide(candidate, px, py));
    if (result.result) candidate.sleeping = result.sleeping;
    return result.result;
  };
  const directed = nativeRopeInput({ ...input, ...controls }, {
    impulse: (body, { request }) => {
      const impulse = nativeBodyImpulse(body, ...request);
      Object.assign(body, { vx: impulse.vx, vy: impulse.vy, angularVelocity: impulse.angularVelocity });
    },
    resize: (body, { length }) => Object.assign(body, nativeRopeLength(body, length, attempt).body),
  }).body;
  const body = nativeRopeBodyTick(directed, environment, {
    awake: nativeBodyAwake,
    terrain: interfaces.solid,
    collide: (x, y, body) => interfaces.collide(body, x, y),
    bounce: (body, hit) => Object.assign(body, nativeRopeContact(body,
      interfaces.otherType(hit), interfaces)),
  });
  // Original004F8720 resets angle damping each rope animation tick.
  body.angleDamping = nativeRopeAnimation(body.facing, body.angle).friction;
  return body;
}

export function nativeRopePoints(body, height) {
  let x = body.anchorX, y = body.anchorY, angle = 0;
  const points = [[x / 65536, height - y / 65536]];
  for (let i = 0; i < body.segmentCount - 1; i++) {
    angle = (angle + body.segments[i * 2 + 1]) | 0;
    x = (x + Math.imul(nativeSin(angle), 8)) | 0;
    y = (y - Math.imul(nativeCos(angle), 8)) | 0;
    points.push([x / 65536, height - y / 65536]);
  }
  points.push([body.x / 65536, height - body.y / 65536]);
  return points;
}

export function stepNativeRopeShot(input, worm, height, solid, collide) {
  const body = { ...input, x: fixed(worm.x), y: fixed(height - worm.y),
    vx: fixed(worm.vx / 50), vy: fixed(-worm.vy / 50) };
  const attempt = (candidate, x, y) => {
    const placement = nativeTryBodyPosition(candidate, x, y,
      (px, py) => collide(candidate, px, py));
    if (placement.result) candidate.sleeping = placement.sleeping;
    return placement.result;
  };
  const result = nativeRopeShotTick(body, {
    state: (candidate, { value }) => {
      const entry = nativeWormTransitionBody(candidate, value, {
        ropeMode: (record['0x70'] >>> 16) & 255,
      }).body;
      candidate.ropeFriction = entry.complexDrag;
      candidate.angleDamping = entry.field08c;
      candidate.field2ec = entry.field2ec;
    },
    ray: (_body, { request }) => nativeHitscanTerrain(...request, solid),
    tryPosition: (candidate, { request: [x, y] }) => attempt(candidate, x, y),
    attach: (candidate, { request: [x, y] }) => {
      const constraint = nativeRopeConstraint(candidate, x, y,
        (px, py, next) => attempt(next, px, py));
      Object.assign(candidate, constraint.body);
      return constraint.result;
    },
  });
  const next = result.body;
  result.tip = {
    x: ((next.x + Math.imul(nativeSin(next.ropeAngle), next.ropeProgress)) | 0) / 65536,
    y: height - ((next.y + Math.imul(nativeCos(next.ropeAngle), next.ropeProgress)) | 0) / 65536,
  };
  return result;
}
