import { NativeGamePalette } from "./game-palette.js";
import { nativeSpritePaletteMap } from "./sprite.js";
import { nativeFontPaletteMap } from "./font.js";

// Load order in004A6B10: small/standard fonts, their alternate white faces,
// medium fonts, large numbers and digital numbers. IDs8/16 load after15.
export const nativeStartupFonts = [
  [1, "smlred1"], [2, "smlblu1"], [3, "smlgrn1"], [4, "smlyel1"],
  [5, "smlppl1"], [6, "smlcyn1"], [7, "smlwht1"],
  [9, "stdred1"], [10, "stdblu1"], [11, "stdgrn1"], [12, "stdyel1"],
  [13, "stdppl1"], [14, "stdcyn1"], [15, "stdwht1"],
  [8, "smlwht2"], [16, "stdwht2"],
  [17, "medred1"], [18, "medblu1"], [19, "medgrn1"], [20, "medyel1"],
  [21, "medppl1"], [22, "medcyn1"], [23, "medwht1"],
  [24, "lnumred1"], [25, "lnumwht1"], [26, "lnumred2"],
  [27, "lnumwht2"], [28, "digiwht"],
];

export function nativeStartupPalette(palette, sprite, font, observe = () => {}) {
  const saved = new NativeGamePalette(1, 255).copyFrom(palette);
  nativeSpritePaletteMap(sprite("cdrom"), palette);
  observe("sprite", 5, "cdrom", palette);
  observe("submit", null, null, palette);
  palette.copyFrom(saved);
  const phone = nativeSpritePaletteMap(sprite("phone"), palette);
  observe("sprite", 6, "phone", palette);
  const fonts = new Map();
  for (const [id, name] of nativeStartupFonts) {
    fonts.set(id, nativeFontPaletteMap(font(name), palette));
    observe("font", id, name, palette);
  }
  // 004A68E0 runs after font setup. Return indices in context-field order.
  const colors = [
    [255, 128, 128], [128, 128, 255], [128, 255, 128],
    [255, 255, 128], [255, 128, 255], [128, 255, 255],
    [0, 0, 0], [157, 157, 157], [255, 255, 255],
  ].map(color => palette.add(color));
  return { phone, fonts, teamIndices: [...colors.slice(0, 6), colors[7], colors[6], colors[8]] };
}
