import * as THREE from "three";
import { decodeImage, imageRGBA } from "./image.js";
import { decodeSprite, spriteFrameRGBA } from "./sprite.js";
import themes from "./terrain-themes.js";

const art = new Map();
export async function loadOriginalTerrain() {
  await Promise.all(
    themes.map(async (theme) => {
      const [soil, grass, gradient, background, debris] = await Promise.all(
        ["soil.img", "grass.img", "gradient.img", "back.spr", "debris.spr"].map(
          async (name) => {
            const response = await fetch(
              `${import.meta.env.BASE_URL}armageddon/media/level/${theme}/level/${name}`,
            );
            if (!response.ok) throw new Error(`Cannot load ${theme}/${name}`);
            const buffer = await response.arrayBuffer();
            if (name === "debris.spr")
              return { ...decodeSprite(buffer), textures: [] };
            if (name === "back.spr") {
              const sprite = decodeSprite(buffer);
              const canvas = document.createElement("canvas");
              canvas.width = sprite.width;
              canvas.height = sprite.height;
              canvas
                .getContext("2d")
                .putImageData(
                  new ImageData(
                    spriteFrameRGBA(sprite, 0),
                    sprite.width,
                    sprite.height,
                  ),
                  0,
                  0,
                );
              return canvas;
            }
            const image = decodeImage(buffer);
            return { ...image, rgba: imageRGBA(image, false) };
          },
        ),
      );
      art.set(theme, { soil, grass, gradient, background, debris });
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

// Source-resolution sky and scenery; camera/parallax placement remains the
// browser adapter. Never stretch the theme's authored silhouettes or dithering.
export function paintOriginalBackdrop(ctx, name, waterLevel) {
  const theme = art.get(name);
  if (!theme) return false;
  const { width, height } = ctx.canvas;
  const { gradient, background } = theme;
  const output = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(y, gradient.height - 1);
    for (let x = 0; x < width; x++) {
      const source = (sourceY * gradient.width + (x % gradient.width)) * 4;
      output.data.set(
        gradient.rgba.subarray(source, source + 4),
        (y * width + x) * 4,
      );
    }
  }
  ctx.putImageData(output, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const top = height - Math.floor(waterLevel) - background.height;
  for (let x = 0; x < width; x += background.width)
    ctx.drawImage(background, x, top);
  return true;
}

export function createTerrainDebris(theme, variant = 0) {
  const sprite = art.get(theme)?.debris;
  if (!sprite) return null;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(sprite.width, sprite.height),
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
  );
  Object.assign(mesh.userData, {
    terrainTheme: theme,
    variant: variant % 4,
    originalTerrainDebris: true,
  });
  updateTerrainDebris(mesh, 0);
  return mesh;
}

export function updateTerrainDebris(mesh, age) {
  const sprite = art.get(mesh.userData.terrainTheme)?.debris;
  if (!sprite) return;
  const index = mesh.userData.variant * 32 + (Math.floor(age * 25) % 32);
  if (!sprite.textures[index]) {
    const canvas = document.createElement("canvas");
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    canvas
      .getContext("2d")
      .putImageData(
        new ImageData(
          spriteFrameRGBA(sprite, index),
          sprite.width,
          sprite.height,
        ),
        0,
        0,
      );
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    sprite.textures[index] = texture;
  }
  mesh.material.map = sprite.textures[index];
  mesh.userData.originalFrame = index;
}
