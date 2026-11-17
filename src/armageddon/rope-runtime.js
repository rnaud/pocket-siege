import records from './scheme-weapon-data.json' with { type: 'json' };
import { nativeTraversalFire } from './traversal-fire.js';
import { nativeRopeShotTick } from './rope-shot.js';
import { nativeRopeConstraint } from './rope-constraint.js';
import { nativeHitscanTerrain } from './hitscan-terrain.js';
import { nativeTryBodyPosition } from './motion.js';
import { nativeSin, nativeCos } from './trig.js';

const words = records.schemes.find(s => s.resource_id === 195).weapons[37];
const record = Object.fromEntries(words.map((v, i) => ['0x' + (0x48 + i * 4).toString(16), v]));
const fixed = value => Math.round(value * 65536) | 0;

export function createNativeRopeShot(worm, angle, height) {
  const radians = angle * Math.PI / 180;
  return nativeTraversalFire({
    state: 0x70, weapon: 37, enabled: 1, facing: worm.facing ?? 1,
    aim: Math.round((Math.asin(Math.sin(radians)) / Math.PI + 0.5) * 65536),
    x: fixed(worm.x), y: fixed(height - worm.y), vx: 0, vy: 0,
    shape: 3, flags: 0x420cc6, sleeping: 0, field104: 1, field108: 0,
    constrained: 0, ropeActive: 0, ropeFiring: 0, ropeRemaining: 0,
    shots: 0, shotLimit: 1, field2a4: 1, field2a8: 1,
    team: worm.team, worm: worm.id ?? 0,
  }, record, { weaponRecord: () => record }).body;
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
