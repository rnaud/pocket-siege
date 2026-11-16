import { paintOriginalTerrain, originalCraterRimColor } from "./armageddon/terrain.js";
import { W, H } from "./physics.js";

export function paintTerrain(ctx, terrain, texture) {
  if (terrain.pixels) {
    // Authored maps keep their palette; consult the mutable collision mask so
    // host explosions and girder writes are reflected without resampling.
    const pixels = terrain.pixels.slice();
    const rimColor = originalCraterRimColor(terrain.theme);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const offset = ((H - 1 - y) * W + x) * 4;
        if (!terrain.data[y * W + x]) pixels.fill(0, offset, offset + 4);
        else if (terrain.craterRim?.[y * W + x] && rimColor)
          pixels.set(rimColor, offset);
        else if (!pixels[offset + 3]) pixels.set([126, 114, 100, 255], offset);
      }
    ctx.putImageData(new ImageData(pixels, W, H), 0, 0);
    texture.needsUpdate = true;
    return;
  }
  if (paintOriginalTerrain(ctx, terrain)) {
    texture.needsUpdate = true;
    return;
  }
  throw new Error(`Current terrain art is not loaded: ${terrain.theme}`);
}
