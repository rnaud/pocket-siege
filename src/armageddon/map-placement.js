import { bodyBlocked, WORM_MASK } from "../physics.js";

const occupied = new Set(
  WORM_MASK.planes[0].points.map(([x, y]) => `${x},${y}`),
);
const supportEdge = WORM_MASK.planes[0].points.filter(
  ([x, y]) => !occupied.has(`${x},${y + 1}`),
);

// Host spawn adapter for imported geometry. Mission/native placement rules
// remain separate; this searches walkable surfaces, including inside caves.
export function originalMapSpawns(terrain, waterLevel, fractions) {
  const candidates = [];
  for (let x = 24; x < terrain.width - 24; x += 4) {
    for (let y = terrain.height - 50; y > waterLevel + 24; y--) {
      if (
        terrain.solid(x, y) ||
        !supportEdge.some(([px, py]) =>
          terrain.solid(
            x + px - WORM_MASK.anchorX,
            y + WORM_MASK.anchorY - py - 2,
          ),
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
          // Native idle artwork spans 24x26 pixels; a 32px separation leaves
          // visible room while accommodating the small training platforms.
          (p) => Math.abs(p.x - point.x) < 32 && Math.abs(p.y - point.y) < 32,
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
