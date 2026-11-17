import { fixedMultiply } from './numeric.js';

// 004ECFB0 event441. Coordinates are native Y-down; rising water reduces Y.
export function nativeWaterRiseStart(input, [rise, duration]) {
  return { ...input, start: input.waterY << 16,
    target: Math.max(0, (input.waterY - rise) << 16), progress: 0, duration, busy: 12 };
}

// 004ECBF0: remove each newly submerged terrain row before updating the
// registry's water bound. The last sample can fall short of target because
// progress is advanced AFTER interpolation, then disabled past65535.
export function nativeWaterRiseTick(input) {
  const body = { ...input }, calls = [];
  if (body.progress < 0) return { body, calls };
  const surface = ((body.start + fixedMultiply((body.target - body.start) | 0, body.progress)) | 0) >> 16;
  while (surface < body.waterY) {
    body.waterY = (body.waterY - 1) | 0;
    calls.push({ operation: 'terrain', waterY: body.waterY });
  }
  calls.push({ operation: 'registry', waterY: body.waterY });
  body.cameraBottom = (body.waterY + 160) << 16;
  if (((body.cameraBottom - body.cameraTop) & 0xffff0000) < 0x3000000)
    body.cameraBottom = (body.cameraTop + 0x3000000) | 0;
  body.bottom = ((body.cameraBottom >> 16) + 40) | 0;
  const divisor = Math.imul(body.duration, 50);
  if (!divisor) throw new RangeError('Native water-rise duration divides by zero');
  body.progress = (body.progress + Math.trunc(65536 / divisor)) | 0;
  if (body.progress > 65535) body.progress = -1;
  body.busy = 12;
  return { body, calls };
}

// Terrain virtual+20 ->004A8CE0 clears [0,y,width,y+1] in both bitmaps.
// Host collision storage is Y-up; authored RGBA storage is already Y-down.
export function clearNativeWaterRow(terrain, width, height, waterY) {
  if (waterY < 0 || waterY >= height) return false;
  const row = height - 1 - waterY;
  terrain.data.fill(0, row * width, (row + 1) * width);
  terrain.pixels?.fill(0, waterY * width * 4, (waterY + 1) * width * 4);
  return true;
}
