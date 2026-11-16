import { decodeImage, imageRGBA } from "./image.js";
import themes from "./terrain-themes.js";

const art = new Map();
export async function loadOriginalTerrain() {
  await Promise.all(
    themes.map(async (theme) => {
      const [soil, grass] = await Promise.all(
        ["soil", "grass"].map(async (name) => {
          const response = await fetch(
            `${import.meta.env.BASE_URL}armageddon/media/level/${theme}/level/${name}.img`,
          );
          if (!response.ok) throw new Error(`Cannot load ${theme}/${name}`);
          const image = decodeImage(await response.arrayBuffer());
          return { ...image, rgba: imageRGBA(image, false) };
        }),
      );
      art.set(theme, { soil, grass });
    }),
  );
}

// Sample original indexed art at one source pixel per terrain pixel. The
// existing collision mask remains authoritative, including newly cut craters.
export function paintOriginalTerrain(ctx, terrain) {
  const theme = art.get(terrain.theme);
  if (!theme) return false;
  const { width, height } = ctx.canvas;
  const surface = (terrain.surfaceCache = Array.from(
    { length: width },
    (_, x) => terrain.surface(x),
  ));
  terrain.artSurface ??= surface.slice();
  const output = ctx.createImageData(width, height);
  const { soil, grass } = theme;
  for (let y = 0; y < height; y++) {
    const worldY = height - 1 - y;
    for (let x = 0; x < width; x++) {
      if (terrain.data[worldY * width + x] !== 1) continue;
      const depth = terrain.artSurface[x] - 1 - worldY;
      const useGrass =
        depth >= 0 &&
        depth < grass.height &&
        surface[x] === terrain.artSurface[x];
      let source = soil;
      let pixel = (y % soil.height) * soil.width + (x % soil.width);
      if (useGrass) {
        const grassPixel = depth * grass.width + (x % grass.width);
        if (grass.pixels[grassPixel]) {
          source = grass;
          pixel = grassPixel;
        }
      }
      output.data.set(
        source.rgba.subarray(pixel * 4, pixel * 4 + 4),
        (y * width + x) * 4,
      );
    }
  }
  ctx.putImageData(output, 0, 0);
  return true;
}
