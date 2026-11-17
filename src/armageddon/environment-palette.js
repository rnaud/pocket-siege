import { fixedMultiply } from './numeric.js';

// 004ADFC0 mutates inclusive palette ranges using signed16-bit channels.
export function nativePaletteBlend(colors, first, last, target, amount) {
  const weight = Math.max(0, Math.min(65536, amount));
  for (let index = first; index <= last; index++) {
    const color = colors[index];
    for (let channel = 0; channel < 3; channel++) {
      const value = (color[channel] << 16) >> 16;
      const destination = (target[channel] << 16) >> 16;
      color[channel] = ((value + fixedMultiply(destination - value, weight)) << 16) >> 16;
    }
  }
}

// 004A27B0: copy the three original palette banks before any transformation.
// Sources retain their own inclusive ranges; cached fields are flash,dark,fade.
export function nativeEnvironmentPalette(input, sources, previous) {
  const dark = Math.max(input.dark, input.extra);
  const cached = [input.flash, dark, input.fade];
  if (cached.every((value, i) => value === previous.cached[i]))
    return { palettes: previous.palettes, cached: previous.cached, calls: [] };
  const palettes = sources.map(source => source.colors.map(color => [...color]));
  const calls = [];
  const blend = (bank, color, amount) => {
    const source = sources[bank - 1];
    nativePaletteBlend(palettes[bank - 1], source.first, source.last, color, amount);
    calls.push({ operation: 'blend', bank, color, amount });
  };
  for (let bank = 1; bank <= 3; bank++) {
    if (bank === 2) blend(bank, [255, 255, 255], input.flash);
    blend(bank, [255, 255, 255], input.fade);
    blend(bank, [0, 0, 0], dark);
  }
  for (let bank = 1; bank <= 3; bank++) calls.push({ operation: 'submit', bank });
  return { palettes, cached, calls };
}
