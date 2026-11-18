import schemes from './scheme-runtime.js';
const defaults = schemes.schemes.find(scheme => scheme.resource_id === 195).bytes;
export const nativeDefaultWind = { strength: (defaults[0] << 24) >> 24,
  fixed: ((defaults[2] | defaults[3] << 8) << 16) >> 16 };

// 004B3110. x and previous are signed16.16; random is the logic stream.
export function nativeWindSelection({ strength, fixed, x, previous }, random) {
  strength = (strength << 24) >> 24;
  const calls = [];
  let wind;
  if (strength < 0) wind = Math.trunc((fixed << 16) / 350) | 0;
  else {
    let candidate;
    for (let attempt = 0; attempt < 10; attempt++) {
      calls.push('random');
      const bias = Math.trunc(Math.imul((960 - (x >> 16)) | 0, 15) / 1920);
      const level = Math.max(-10, Math.min(10, bias - 10 + (random() & 255) % 21));
      candidate = Math.trunc((level << 16) / 35) | 0;
      if (attempt === 9) break;
      calls.push('previousWind');
      const delta = (candidate - previous) | 0;
      const sign = delta >> 31;
      if ((((delta ^ sign) - sign) | 0) >= 0xccc) break;
    }
    wind = Math.trunc(Math.imul(strength, candidate) / 100) | 0;
  }
  calls.push('windEvent');
  return { wind, calls };
}
