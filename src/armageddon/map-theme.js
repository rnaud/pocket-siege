import {fetchGameAsset as fetch} from '../asset-cache.js';
import themes from "./terrain-themes.js";
import { decodeImage } from "./image.js";
import { NativeMapPalette } from "./map-palette.js";

// 0040A3F0 loads these images in order into one native palette. Bitmap modes
// 4/5 omit text.img. 00408960 binds the bridge triplet at +0x38/+0x3c/+0x40
// and grass at +0x34; 00409410 reads the rim color from grass pixel (128,0).
export function nativeMapTheme(
  source,
  bitmap = false,
  palette = new NativeMapPalette(),
) {
  const images = {};
  const names = ["soil", "grass", "bridge-l", "bridge", "bridge-r"];
  if (!bitmap) names.unshift("text");
  for (const name of names) images[name] = palette.remap(source[name]);
  const grass = images.grass;
  return {
    images,
    palette,
    platform: images.bridge,
    rimColor: grass.width > 128 && grass.height ? grass.pixels[128] : 0,
  };
}

const pending = new Map(),
  prepared = new Map(),
  ready = new Map();
export const preparedNativeMapTheme = (theme,bitmap=false) => ready.get(`${theme}:${bitmap}`);
export function loadNativeMapTheme(theme, bitmap = false, palette) {
  if (!themes.includes(theme))
    throw new Error(`Unknown terrain theme ${theme}`);
  const key = `${theme}:${bitmap}`;
  if (!pending.has(key)) {
    const names = ["soil", "grass", "bridge-l", "bridge", "bridge-r"];
    if (!bitmap) names.unshift("text");
    const request = Promise.all(
      names.map(async (name) => {
        const response = await fetch(
          `${import.meta.env.BASE_URL}armageddon/media/level/${theme}/level/${name}.img`,
        );
        if (!response.ok) throw new Error(`Cannot load ${theme}/${name}`);
        return [name, decodeImage(await response.arrayBuffer())];
      }),
    )
      .then((entries) => Object.fromEntries(entries))
      .catch((error) => {
        pending.delete(key);
        prepared.delete(key);
        throw error;
      });
    pending.set(key, request);
  }
  if (palette)
    return pending
      .get(key)
      .then((source) => nativeMapTheme(source, bitmap, palette));
  if (!prepared.has(key))
    prepared.set(
      key,
      pending.get(key).then((source) => {
        const theme=nativeMapTheme(source,bitmap);ready.set(key,theme);return theme;
      }),
    );
  return prepared.get(key);
}
