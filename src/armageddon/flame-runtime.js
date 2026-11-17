import { nativeFlameMotion } from './flame-motion.js';
import { nativeFlameHit } from './flame-hit.js';
import { nativeFlameSpread } from './flame-spread.js';
import { nativeFlameTick } from './flame-tick.js';

// Compose one event3EA update; the caller owns task ordering and actor lifetime.
// Rendering stays a separate event3EB call, as in the original task dispatcher.
export function stepNativeFlame(body, record, environment, interfaces) {
  return nativeFlameTick(body, record, environment, {
    ...interfaces,
    motion: input => nativeFlameMotion(input, {
      ...interfaces, wind: () => environment.wind,
      gravity: () => environment.gravity, random: interfaces.logicRandom,
    }),
    hit: (input, currentRecord) => {
      const { damage, persistent, ...result } = nativeFlameHit({
        ...input, damage: currentRecord[6], persistent: currentRecord[10],
      }, interfaces.candidates(), interfaces);
      return result;
    },
    spread: child => nativeFlameSpread(child, {
      ...interfaces, random: interfaces.logicRandom,
    }),
  });
}
