import {
  nativeCandidateGrid,
  nativeMapCandidateStage,
  nativeSortMapCandidates,
} from "./map-candidates.js";
import { nativeMapFallback, nativeMapFallbackMasks } from "./map-fallback.js";

// Landgen 00409790 followed by 00409730. The native scene supplies palette-
// indexed color/collision/backing layers, theme platform pixels, and rim color.
// Existing exclusions are extended in discovery order; only the returned
// candidate list is sorted. Fallback carving does not rebuild the coarse grid.
export function nativeGenerateMapCandidates(layers, settings, random) {
  const { water, requested, platform, rimColor } = settings;
  const grid = nativeCandidateGrid(layers.color);
  const discovered = nativeMapCandidateStage(layers.solid, grid, water, random);
  const existing = [
    ...(settings.existing ?? []).map((p) => ({ ...p })),
    ...discovered.map((p) => ({ ...p })),
  ];
  if (discovered.length < 32 && discovered.length < requested) {
    const masks = nativeMapFallbackMasks();
    while (discovered.length < requested) {
      const result = nativeMapFallback(
        layers,
        existing,
        {
          ...masks,
          platform,
          rimColor,
          water,
          distance: 130,
          limit: 30,
          x: 0,
          y: 0,
        },
        random,
      );
      if (!result.found) continue;
      const point = { x: result.x, y: result.y };
      discovered.push(point);
      existing.push({ ...point });
    }
  }
  return {
    points: nativeSortMapCandidates(discovered),
    discovered,
    existing,
    grid,
  };
}
