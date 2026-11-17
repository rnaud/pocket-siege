import { nativeVectorLength } from './blast-damage.js';
import { fixedDivide } from './numeric.js';

// Original004F9A20, immediate type1/mode3 release while moving. Direction
// comes from velocity, not aim; 0049BF50 normalizes with native length math.
export function nativeMovingFire(input, weaponRecord, interfaces = {}) {
  const body = { ...input }, record = { ...weaponRecord }, calls = [];
  const invoke = (operation, extra = {}) => {
    calls.push({ operation, ...extra });
    return interfaces[operation]?.(body, record, extra);
  };
  const done = result => ({ body, record, result, calls });
  if (!body.weapon || !body.enabled || record['0x68'] !== 1 || record['0x70'] !== 3) return done(0);
  body.field27c = 0;
  body.field2a4 = body.field2a8 = 1;
  body.shots = (body.shots + 1) | 0;
  const length = nativeVectorLength(body.vx, body.vy);
  let vx = length ? fixedDivide(body.vx, length) : body.vx;
  let vy = length ? fixedDivide(body.vy, length) : body.vy;
  body.power = Math.trunc(length / 24) | 0;
  if (body.power < 0x28f) { vx = 0; vy = 65536; }
  let x = body.x, y = body.y;
  if ([3, 7].includes(record['0x6c'])) {
    x = (x + Math.imul(vx, 14)) | 0;
    y = (y + Math.imul(vy, 14)) | 0;
  }
  invoke('launch', { request: [x, y, vx, vy] });
  invoke('finish');
  return done(1);
}
