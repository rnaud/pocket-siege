import { nativeWaterSound } from './water-audio.js';

// Original004DCD60: fixed-point mouth position and visual RNG requests.
export function nativeWormBubbles(input, frame, random = () => 0) {
  const body = { ...input }, calls = [];
  const drowning = body.state === 0x85 || body.state === 0x87;
  const breathing = body.state === 0x82 || body.state === 0x83;
  if (!drowning && !breathing) return { body, calls };
  const increment = drowning ? 0x4000 : body.progress >= 0xf333 ? (frame & 63) * 256 : 0;
  body.bubbleProgress = (body.bubbleProgress + increment) | 0;
  while (body.bubbleProgress >= 0x10000) {
    body.bubbleProgress = (body.bubbleProgress - 0x10000) | 0;
    const dx = Math.imul(body.facing, 0x30000);
    calls.push({ operation: 'bubble', request: [
      (body.x + dx) | 0, (body.y + (drowning ? -0x50000 : 0x30000)) | 0,
      dx, 0, (random() & (drowning ? 3 : 1)) + 1,
    ] });
  }
  return { body, calls };
}

// Original004DE7C2..004DE7E6: virtual+F8 reads body+BC (submerged).
export function nativeWormDrowningState(body) {
  return body.submerged && body.state !== 0x87 ? 0x87 : null;
}

// Original004D6720: worm skim callback, after004C9F10 changes velocity.
// State entry may release a rope constraint; callers must apply it before
// choosing constrained or free movement for the remainder of this tick.
export function nativeWormSkim(input, interfaces = {}) {
  const body = { ...input }, calls = [];
  const sound = nativeWaterSound(body, true).sound;
  calls.push({ operation: 'sound', request: sound });
  interfaces.sound?.(sound);
  if (body.state !== 0x81) {
    calls.push({ operation: 'state', target: 0x81 });
    interfaces.state?.(body, 0x81);
    body.state = 0x81;
  }
  return { body, calls, worldSkim: 1 };
}
