import {fetchGameAsset as fetch} from '../asset-cache.js';
import { decodeImage, imageRGBA } from "./image.js";

const girders = new Map();
const arrows = [];
// Girders and the 32 Longbow arrow headings (arrow00..31.img, 004A59CF),
// both blitted into the landscape.
export async function loadOriginalGirders() {
  await Promise.all([
    ...Array.from({ length: 32 }, async (_, index) => {
      const name = `arrow${String(index).padStart(2, "0")}`;
      const response = await fetch(
        `${import.meta.env.BASE_URL}armageddon/media/gfx/gfx/${name}.img`,
      );
      if (!response.ok) throw new Error(`Cannot load ${name}`);
      const image = decodeImage(await response.arrayBuffer());
      arrows[index] = { ...image, rgba: imageRGBA(image) };
    }),
    ...["s", "l"].flatMap((size) =>
      Array.from({ length: 9 }, async (_, index) => {
        const name = `grd${size}${index}`;
        const response = await fetch(
          `${import.meta.env.BASE_URL}armageddon/media/gfx/gfx/${name}.img`,
        );
        if (!response.ok) throw new Error(`Cannot load ${name}`);
        const image = decodeImage(await response.arrayBuffer());
        girders.set(name, { ...image, rgba: imageRGBA(image) });
      }),
    ),
  ]);
}
export function originalArrow(index) {
  return arrows[index];
}

// Landscape +0x14 (004A8BB0): blit an image's non-zero pixels into both the
// visual and the collision layer, native top-left corner at (left, top).
export function stampNativeLandscapeImage(terrain, width, height, left, top, image) {
  const pixels =
    terrain.pixels ??
    (terrain.decorationPixels ??= new Uint8ClampedArray(width * height * 4));
  let placed = 0;
  for (let sy = 0; sy < image.height; sy++)
    for (let sx = 0; sx < image.width; sx++) {
      const source = sy * image.width + sx;
      if (!image.pixels[source]) continue;
      const x = left + sx, row = top + sy;
      if (x < 0 || x >= width || row < 0 || row >= height) continue;
      terrain.data[(height - 1 - row) * width + x] = 1;
      pixels.set(image.rgba.subarray(source * 4, source * 4 + 4), (row * width + x) * 4);
      placed++;
    }
  return placed;
}
export function originalGirder(name) {
  return girders.get(name);
}

// Stamp native indexed pixels into the host's destructible terrain. Native
// selection, placement limits and collision validation remain separate ports.
export function stampOriginalGirder(terrain, width, height, cx, cy, name) {
  const image = girders.get(name);
  if (!image) return false;
  const pixels =
    terrain.pixels ??
    (terrain.decorationPixels ??= new Uint8ClampedArray(width * height * 4));
  const left = Math.round(cx) - Math.floor(image.width / 2);
  const top = Math.round(cy) + Math.floor(image.height / 2);
  let placed = 0;
  for (let sy = 0; sy < image.height; sy++)
    for (let sx = 0; sx < image.width; sx++) {
      const source = sy * image.width + sx;
      if (!image.pixels[source]) continue;
      const x = left + sx,
        y = top - sy;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      terrain.data[y * width + x] = 1;
      const offset = ((height - 1 - y) * width + x) * 4;
      pixels.set(image.rgba.subarray(source * 4, source * 4 + 4), offset);
      placed++;
    }
  return { name, width: image.width, height: image.height, placed };
}
