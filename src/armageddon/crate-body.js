import { nativeCrateState } from './crate-state.js';

// 004DFCE8..004DFF3B. The caller supplies the initialized base body and
// copied crate record; category/shape registry changes retain their interfaces.
export function nativeCratePlacement(input, record, mode, bottom, interfaces) {
  let body = { ...input };
  if (record.kind === 3) body.fuse = Math.imul(record.fuseSeconds, 1000);
  interfaces.shape(body, record.kind === 5 ? 2 : 5);
  body.flags = 2;
  const x = record.x;
  let y = record.y;
  while (interfaces.collide(x, y, body)) y = (y - 0x100000) | 0;
  body.x = x;
  body.y = y;
  body.sleeping = 0;
  body.restitutionX = 0;
  body.flags = 0x40080e;
  body.windScale = 0;
  body.restitutionY = 0x8000;
  body.mass = 65536;
  body.enabled = 1;
  const sound = (id, priority) => interfaces.sound([id, priority, 65536, 65536, 0]);
  if (body.kind === 5) {
    body = nativeCrateState(body, 104);
    body.vx = 0;
    body.vy = -0x40000;
    if (body.type !== 12) {
      interfaces.remove(body);
      body.type = 12;
      interfaces.register(body);
    }
    sound(20, 8);
  } else if (mode === 0) {
    while ((y >> 16) < bottom) {
      if (interfaces.collide(x, y, body)) break;
      body.x = x;
      body.y = y;
      body.sleeping = 0;
      y = (y + 65536) | 0;
    }
    interfaces.effect([65536, x, y, 0, 0, 0, 0, 0, 0x349, 0, 65536, 0x1999]);
    sound(115, 2);
    body = nativeCrateState(body, 104);
  } else if (mode === 1 || mode === 2) {
    sound(mode === 1 ? 67 : 52, 2);
    body = nativeCrateState(body, mode === 1 ? 100 : 101);
  }
  return body;
}
