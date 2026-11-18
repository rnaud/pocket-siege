import {fetchGameAsset as fetch} from '../asset-cache.js';
import definitions from "./terrain-objects.json";
import { decodeImage, imageRGBA } from "./image.js";
import {
  nativeTerrainObjectMasks,
  nativeFindTerrainObject,
} from "./terrain-object-masks.js";

const loaded = new Map(),
  pending = new Map();
export function loadOriginalDecorations(theme) {
  if (!pending.has(theme))
    pending.set(
      theme,
      (async () => {
        const objects = await Promise.all(
          definitions[theme].objects.map(async (definition) => {
            const response = await fetch(
              `${import.meta.env.BASE_URL}armageddon/media/level/${theme}/level/${definition.name}.img`,
            );
            if (!response.ok)
              throw new Error(`Cannot load ${theme}/${definition.name}`);
            const source = decodeImage(await response.arrayBuffer());
            return [false, true].map((mirrored) => {
              const pixels = source.pixels.slice();
              if (mirrored)
                for (let y = 0; y < source.height; y++)
                  for (let x = 0; x < source.width; x++)
                    pixels[y * source.width + x] =
                      source.pixels[y * source.width + source.width - 1 - x];
              const image = { ...source, pixels };
              let direction = definition.fields[5];
              if (mirrored && direction < 2) direction ^= 1;
              return {
                name: definition.name,
                mirrored,
                weight: definition.fields[0],
                direction,
                image,
                rgba: imageRGBA(image),
                mask: nativeTerrainObjectMasks(image, direction),
              };
            });
          }),
        );
        loaded.set(theme, objects.flat());
      })().catch((error) => {
        pending.delete(theme);
        throw error;
      }),
    );
  return pending.get(theme);
}

// Landgen's weighted selection, 16 attempts and paired directional scans.
// The browser supplies its own map dimensions, seed and decoration count.
export function placeOriginalDecorations(terrain, width, height, count = 24) {
  const objects = loaded.get(terrain.theme);
  if (!objects || terrain.decorationPixels) return [];
  terrain.artSurface = Array.from({ length: width }, (_, x) =>
    terrain.surface(x),
  );
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    pixels.set(
      terrain.data.subarray((height - 1 - y) * width, (height - y) * width),
      y * width,
    );
  const occupancy = nativeTerrainObjectMasks({ width, height, pixels }, 3);
  const grid = {
    width: Math.floor(width / 8),
    height: Math.floor(height / 8),
    cells: new Uint8Array(Math.floor(width / 8) * Math.floor(height / 8)),
  };
  for (let y = 0; y < grid.height; y++)
    for (let x = 0; x < grid.width; x++)
      grid.cells[y * grid.width + x] =
        occupancy.occupancy[y * occupancy.width + x];
  const overlay = (terrain.decorationPixels = new Uint8ClampedArray(
    width * height * 4,
  ));
  const placements = (terrain.decorations = []);
  let seed = terrain.seed >>> 0;
  const random = () =>
    (seed = (Math.imul(seed, 0x19660d) + 0x3c6ef35f) >>> 0) & 65535;
  const total = objects.reduce((sum, object) => sum + object.weight, 0);
  for (let n = 0; n < count; n++) {
    const roll = random();
    let weight = 0;
    const object =
      objects.find((object) => {
        weight += object.weight;
        return roll < Math.floor((weight * 65536) / total);
      }) || objects[0];
    const { mask, image, rgba, direction } = object;
    if (mask.width >= grid.width || mask.height >= grid.height) continue;
    for (let attempt = 0; attempt < 16; attempt++) {
      const x = random() % (grid.width - mask.width),
        y = random() % (grid.height - mask.height);
      const position =
        nativeFindTerrainObject(mask, grid, x, y, direction) ||
        nativeFindTerrainObject(mask, grid, x, y, direction ^ 1);
      if (!position) continue;
      const left = position.x * 8,
        top = position.y * 8;
      // Original mode 3 blit: opaque source pixels only into empty terrain.
      for (let sy = 0; sy < image.height; sy++)
        for (let sx = 0; sx < image.width; sx++) {
          const source = sy * image.width + sx,
            target = (top + sy) * width + left + sx;
          const collision = (height - 1 - top - sy) * width + left + sx;
          if (!image.pixels[source] || terrain.data[collision]) continue;
          terrain.data[collision] = 1;
          overlay.set(rgba.subarray(source * 4, source * 4 + 4), target * 4);
        }
      for (let cy = 0; cy < mask.height; cy++)
        for (let cx = 0; cx < mask.width; cx++)
          grid.cells[(position.y + cy) * grid.width + position.x + cx] = 3;
      placements.push({
        name: object.name,
        mirrored: object.mirrored,
        x: left,
        y: top,
      });
      break;
    }
  }
  return placements;
}
