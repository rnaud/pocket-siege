import { bodyBlocked } from "../physics.js";

// Host spawn adapter for imported geometry. Mission/native placement rules
// remain separate; this searches walkable surfaces, including inside caves.
export function originalMapSpawns(terrain, waterLevel, fractions) {
  const candidates = [];
  for (let x = 24; x < terrain.width - 24; x += 4) {
    for (let y = terrain.height - 50; y > waterLevel + 24; y--) {
      if (
        terrain.solid(x, y) ||
        ![-16, -8, 0, 8, 16].some(
          (dx) => terrain.solid(x + dx, y - 11) || terrain.solid(x + dx, y - 8),
        )
      )
        continue;
      if (!bodyBlocked(terrain, x, y) && bodyBlocked(terrain, x, y - 1))
        candidates.push({ x, y });
    }
  }
  const chosen = [];
  for (const fraction of fractions) {
    const target = fraction * terrain.width;
    let best,
      score = Infinity;
    for (const point of candidates) {
      if (
        chosen.some(
          (p) => Math.abs(p.x - point.x) < 40 && Math.abs(p.y - point.y) < 60,
        )
      )
        continue;
      const value =
        Math.abs(point.x - target) + (terrain.height - point.y) * 0.05;
      if (value < score) {
        best = point;
        score = value;
      }
    }
    if (!best)
      throw new Error(`Not enough safe spawn positions in ${terrain.id}`);
    chosen.push(best);
  }
  return chosen;
}
