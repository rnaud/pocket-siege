import attenuation from "./sound-attenuation.json" with { type: "json" };
import { fixedMultiply } from "./numeric.js";

// 00496940 startup and 00496D80 volume updates. DirectSound units are
// hundredths of a decibel. Table is the 65 signed words at 0055E2F8.
export function nativeSoundVolume(volume, master = 65536, flags = 0, initial = true) {
  volume = Math.max(0, Math.min(65536, volume | 0));
  if (initial) volume = Math.trunc(volume * 3 / 4);
  if (!(flags & 0x20000)) volume = fixedMultiply(master, volume);
  return attenuation[(volume << 6) >> 16];
}
export function nativeSoundPan(pan) {
  pan = Math.max(-65536, Math.min(65536, pan | 0));
  const value = attenuation[64 - ((Math.abs(pan) << 6) >> 16)];
  return pan > 0 ? -value : value;
}
export function nativeSoundFrequency(frequency, pitch, speed = 1) {
  return Math.trunc(fixedMultiply(frequency, pitch) / speed) | 0;
}
// Convert the original backend's logarithmic units to Web Audio amplitude.
export const nativeAttenuationGain = value => value <= -10000 ? 0 : 10 ** (value / 2000);
