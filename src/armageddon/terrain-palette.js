import { NativeGamePalette } from "./game-palette.js";
import { nativeImagePaletteMap } from "./image.js";
import { nativeSpritePaletteMap } from "./sprite.js";

// 004A78A0 loads soil/grass;004A5350 subsequently adds gradient/back/debris.
// A native serialized level may already have populated the supplied bank.
export function nativeTerrainPalette(sources, palette = new NativeGamePalette(137, 248)) {
  const result = { palette };
  for (const name of ["soil", "grass", "gradient", "background", "debris"]) {
    const source = sources[name];
    const mapping = (name === "background" || name === "debris" ? nativeSpritePaletteMap : nativeImagePaletteMap)(source, palette);
    result[name] = { ...source, sharedPalette: { mapping, colors: palette.colors } };
  }
  return result;
}
