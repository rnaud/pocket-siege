// Original004F8D50 state71 entry. Coordinates are signed16.16, Y down.
// 004FAF90 launch setup and the collision-aware +100 position attempt are
// interfaces; the latter can reject snapping without preventing initialization.
export function nativeBlowtorchEntry(input, record, stats, positionAccepted) {
  const x = input.x & -65536, y = input.y & -65536;
  return {
    body: {
      ...input,
      x: positionAccepted ? x : input.x,
      y: positionAccepted ? y : input.y,
      field1f4: 0, field1f8: 0, field1fc: x, field27c: 0,
      remaining: record['0x7c'] | 0, suspended: 1,
    },
    stats: {
      counter58c: (stats.counter58c + 3) | 0,
      counter590: (stats.counter590 + 5) | 0,
    },
    calls: [
      { operation: 'launchSetup', value: 0 },
      { operation: 'tryPosition', request: [x, y] },
      { operation: 'clear' },
      { operation: 'queue', sprite: 125 },
      { operation: 'suspend', value: 1 },
    ],
  };
}

import { fixedMultiply } from './numeric.js';
import { nativeSin, nativeCos } from './trig.js';

// Original004F8E50. The caller supplies004FAF90's vertical direction and
// the collision-aware position-attempt interface, preserving call order.
export function nativeBlowtorchTick(input, record, slope, tryPosition, dispatch = () => {}) {
  const body = { ...input }, calls = [];
  const emit = (...events) => { for (const event of events) { calls.push(event); dispatch(event, body); } };
  if (body.sprite !== 125) return { body, calls };
  emit({ operation:'launchSetup', value:0 });
  const oldX = body.x, oldY = body.y;
  body.field1f8 = (body.field1f8 + 0xf5c) | 0;
  emit({ operation:'progress', value:body.field1f8 });
  if (body.field1f4 !== body.field1f8 >> 16) {
    body.field1f4 = body.field1f8 >> 16;
    body.field1fc = oldX;
  }
  const x = (Math.imul(Math.imul(body.field1f8 & 65535, body.facing), 9) + body.field1fc) | 0;
  const delta = fixedMultiply(fixedMultiply(slope, 0x90000), 0xf5c);
  const y = (oldY + Math.trunc((delta << 2) / 5)) | 0;
  const angle = Math.trunc((record['0x78'] << 16) / 360);
  emit({ operation:'area', request:[
    (x + Math.imul(body.facing, 0xc0000)) | 0, y, 0xc0000, 0x190000, record['0x70'],
    Math.imul(Math.trunc(Math.imul(nativeSin(angle),record['0x74']) / 10),body.facing),
    Math.trunc(Math.imul(nativeCos(angle),record['0x74']) / -10) | 0,
    7, 0x37, 0, 0x21c4c, 1,
  ] });
  const mask = body.facing < 0 ? (slope < -0x1999 ? 6 : 7 + Number(slope > 0x1999))
    : (slope < -0x1999 ? 9 : 10 + Number(slope > 0x1999));
  emit({ operation:'terrain', request:[mask,x >> 16,y >> 16] });
  const attempt = (px,py) => {
    px |= 0; py |= 0;
    emit({ operation:'tryPosition', request:[px,py] });
    const accepted = tryPosition(px,py,body.flags,body);
    if (accepted) { body.x = px; body.y = py; }
    return accepted;
  };
  const stop = () => { emit({ operation:'state', value:0x65 }); return { body,calls }; };
  const flags = body.flags;
  body.flags = 2; emit({ operation:'flags', value:2 });
  const moved = attempt(x,y);
  body.flags = flags; emit({ operation:'flags', value:flags });
  if (!moved) return stop();
  if (attempt(x,y+0x60000)) { attempt(oldX,oldY); return stop(); }
  for (const offset of [5,4,3]) {
    if (attempt(x,y+offset*65536)) { attempt(x,y+(offset-2)*65536); break; }
  }
  body.remaining = (body.remaining - 20) | 0;
  if (body.remaining <= 0) return stop();
  emit({ operation:'camera' });
  return { body,calls };
}

import { nativeWeaponAnimation } from './weapon-animation.js';

// Original004F9160. Resume physics, then settle downward one pixel at a
// time when the six-pixel support probe hits. Position attempts own collision.
export function nativeBlowtorchExit(input, record, probe, tryPosition) {
  const body = { ...input, suspended: 0 };
  const calls = [{ operation:'suspend', value:0 }];
  const x = body.x, y = body.y;
  calls.push({ operation:'probe', request:[x,(y+0x60000)|0] });
  if (!probe(x,(y+0x60000)|0)) return { body,calls };
  let nextY = (y+65536)|0;
  for (;;) {
    calls.push({ operation:'tryPosition', request:[x,nextY] });
    if (!tryPosition(x,nextY,body)) break;
    body.x = x; body.y = nextY;
    nextY = (nextY+65536)|0;
  }
  calls.push({ operation:'clear' }, {
    operation:'queueControlled', sprite:nativeWeaponAnimation(record), progress:body.aim,
  });
  body.field19c = 1;
  return { body,calls };
}
