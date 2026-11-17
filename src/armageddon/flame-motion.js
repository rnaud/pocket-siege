import { fixedMultiply } from './numeric.js';

// 004D42D0: flames sweep in fixed0x28F fractions, independently of the
// generic body's collision mask and bounce system.
export function nativeFlameMotion(input, interfaces) {
  const body = { ...input };
  const { collide } = interfaces;
  if (!body.vx && !body.vy && collide(body.x >> 16, (body.y >> 16) + 1))
    return { body, result: 0 };
  interfaces.busy();
  body.vx = (body.vx + interfaces.wind()) | 0;
  body.vy = (body.vy + Math.imul(interfaces.gravity(), 2)) | 0;
  body.vx = (body.vx + (interfaces.random() & 0xffff) - 0x8000) | 0;
  body.vy = (body.vy + (interfaces.random() & 0xffff) - 0x8000) | 0;
  body.vx = fixedMultiply(body.vx, 0xe666);
  body.vy = fixedMultiply(body.vy, 0xe666);
  let x = body.x, y = body.y;
  for (let fraction = 0; fraction <= 65536; fraction += 0x28f) {
    const nextX = (body.x + fixedMultiply(body.vx, fraction)) | 0;
    const nextY = (body.y + fixedMultiply(body.vy, fraction)) | 0;
    if (collide(nextX >> 16, nextY >> 16)) {
      body.vx = body.vy = 0;
      body.contact = 1;
      break;
    }
    x = nextX; y = nextY;
  }
  if (body.x === x && body.y === y) return { body, result: 0 };
  body.x = x; body.y = y;
  if (collide(x >> 16, (y >> 16) + 1)) body.vx = body.vy = 0;
  return { body, result: 1 };
}
