import * as THREE from "three";
import { decodeSprite, spriteFrameRGBA } from "./armageddon/sprite.js";
import { decodeImage } from "./armageddon/image.js";
import { nativePaletteDisplay } from "./armageddon/palette-material.js";

let waterArt;
export async function loadOriginalWater() {
  const base = `${import.meta.env.BASE_URL}armageddon/media/water/blue/water/`;
  const [layer, fill] = await Promise.all(
    ["layer/layer.spr", "fill.img"].map(async (name) => {
      const response = await fetch(base + name);
      if (!response.ok) throw new Error(`Cannot load original water ${name}`);
      return response.arrayBuffer();
    }),
  );
  const sprite = decodeSprite(layer),
    image = decodeImage(fill);
  const color = image.palette.slice(
    image.pixels[0] * 4,
    image.pixels[0] * 4 + 3,
  );
  const frames = sprite.frames.map((_, i) => {
    const canvas = document.createElement("canvas");
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    canvas
      .getContext("2d")
      .putImageData(
        new ImageData(spriteFrameRGBA(sprite, i), sprite.width, sprite.height),
        0,
        0,
      );
    return canvas;
  });
  waterArt = { sprite, frames, color: `rgb(${color.join(",")})` };
}

// Native wave pixels tiled horizontally over the source fill colour. The
// browser clock currently drives this zero-rate strip; native layer timing
// and parallax are separate remaining ports.
// depth extends the fill below the landscape bottom and margin past both map
// edges, covering everything the native camera limits can show.
export function createWater(mapWidth, level, depth = 0, margin = 0) {
  const width = mapWidth + 2 * margin;
  const canvas = document.createElement("canvas"),
    context = canvas.getContext("2d");
  canvas.width = Math.ceil(width);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 1),
    nativePaletteDisplay.bind(new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }), 2),
  );
  let currentLevel = level,
    lastFrame = -1,
    lastHeight = -1;
  mesh.userData.update = (time, restoredFrame = null) => {
    if (!waterArt) return;
    const { sprite, frames, color } = waterArt;
    const frame = restoredFrame ?? Math.floor(Math.max(0, time) * 25) % frames.length;
    const crest = Math.floor(sprite.height / 2);
    const height = Math.max(1, Math.ceil(currentLevel) + crest + depth);
    if (lastFrame === frame && lastHeight === height) return;
    if (canvas.height !== height) {
      texture.dispose();
      canvas.height = height;
    }
    context.clearRect(0, 0, canvas.width, height);
    context.fillStyle = color;
    context.fillRect(0, crest, canvas.width, height - crest);
    context.imageSmoothingEnabled = false;
    // Tile from the map's left edge so the waves stay aligned with it.
    for (let x = margin % sprite.width - sprite.width; x < width; x += sprite.width)
      context.drawImage(frames[frame], x, 0);
    mesh.scale.y = height;
    mesh.position.set(width / 2 - margin, height / 2 - depth, 22);
    texture.needsUpdate = true;
    lastFrame = frame;
    lastHeight = height;
    Object.assign(mesh.userData, {
      originalSprite: "water/blue/water/layer/layer.spr",
      originalFrame: frame,
      surfaceLevel: currentLevel,
    });
  };
  mesh.userData.setLevel = (nextLevel) => {
    currentLevel = nextLevel;
    lastHeight = -1;
  };
  return mesh;
}
