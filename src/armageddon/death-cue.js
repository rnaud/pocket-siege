// 004DE582–004DE5F6: state 0x84, original sprite 10. RNG is consumed only
// when the one-shot voice cue becomes due. Team sound lookup is external.
export function nativeDeathCue(sprite, progress, spoken, random) {
  let sound = null,
    randomCalls = 0;
  if (sprite !== 10) return { spoken, sound, randomCalls, complete: false };
  if (progress >= 0x435e && spoken === 0) {
    const value = random();
    randomCalls++;
    sound = [value & 0x10000 ? 6 : 0x21, 3, 0x10000, 0x10000, 0];
    spoken = (spoken + 1) | 0;
  }
  return {
    spoken,
    sound,
    randomCalls,
    complete: (progress & 0xffff0000) >= 0x10000,
  };
}
