import { nativeWaterSound } from './water-audio.js';

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
