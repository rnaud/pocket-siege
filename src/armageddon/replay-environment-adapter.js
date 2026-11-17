import { MatchRandom } from './random.js';
import { NativeGamePalette } from './game-palette.js';

// Host backing layers for native replay adapters. This is not the original
// binary snapshot format: it preserves the browser terrain's two coordinate
// layouts and palette allocator alongside the already-native random streams.
const terrainFields = ['data', 'pixels', 'sourcePixels', 'nativePaletteMapping',
  'decorationPixels', 'craterRim', 'decorations', 'id', 'seed', 'layout', 'theme'];
function checkDimensions(terrain, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 ||
      terrain.data?.length !== width * height ||
      (terrain.width !== undefined && terrain.width !== width) ||
      (terrain.height !== undefined && terrain.height !== height))
    throw new RangeError('Replay terrain dimensions do not match the active world');
}
export function captureReplayEnvironment(terrain, random, width, height) {
  checkDimensions(terrain, width, height);
  const layers = {};
  for (const key of terrainFields) if (Object.hasOwn(terrain, key)) layers[key] = terrain[key];
  return structuredClone({ width, height, layers, palette: terrain.nativePalette ?? null, random: random.snapshot() });
}

export function restoreReplayEnvironment(snapshot, terrain, random, width, height, repaint) {
  checkDimensions(terrain, width, height);
  if (snapshot.width !== width || snapshot.height !== height)
    throw new RangeError('Cannot restore replay terrain into a different map size');
  checkDimensions(snapshot.layers, width, height);
  // Validate and detach everything before touching live state. Keep the saved
  // snapshot reusable after subsequent explosions, girders and random draws.
  const saved = structuredClone(snapshot), checkedRandom = new MatchRandom(0);
  checkedRandom.restore(saved.random);
  for (const key of terrainFields) {
    if (!Object.hasOwn(saved.layers, key)) { delete terrain[key]; continue; }
    const value = saved.layers[key], current = terrain[key];
    if (ArrayBuffer.isView(value) && current?.constructor === value.constructor && current.length === value.length)
      current.set(value);
    else terrain[key] = value;
  }
  if (saved.palette) {
    terrain.nativePalette ??= new NativeGamePalette(saved.palette.first, saved.palette.last);
    terrain.nativePalette.copyFrom(saved.palette);
  } else delete terrain.nativePalette;
  random.restore(checkedRandom.snapshot());
  // The host owns canvas uploads and collision-registry invalidation.
  repaint?.(terrain);
}
