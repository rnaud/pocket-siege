// Seeded geometry only: the renderer paints the resulting destructible mask.
export const MAP_LAYOUTS = ["fern", "highlands", "archipelago", "forts"];
export function generateTerrain(data, width, height, seed, layout) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const anchors = [0, 180, 340, 490, 710, 860, 1020, 1200];
  const heights = anchors.map(() => 240 + Math.floor(random() * 145));
  for (let x = 14; x < width - 14; x++) {
    const u = (x * 1200) / width;
    let i = 0;
    while (i < anchors.length - 2 && u > anchors[i + 1]) i++;
    const a = anchors[i],
      b = anchors[i + 1];
    // Broad level shoulders give each starting worm room to stand and move.
    const t = Math.max(0, Math.min(1, (u - a - 35) / (b - a - 70)));
    const smooth = t * t * (3 - 2 * t);
    let top = heights[i] + (heights[i + 1] - heights[i]) * smooth;
    if (
      layout === "archipelago" &&
      ((u > 558 && u < 642) || (u > 245 && u < 275) || (u > 935 && u < 965))
    )
      continue;
    if (layout === "forts") {
      const distance = Math.min(
        ...anchors.slice(1, -1).map((a) => Math.abs(a - u)),
      );
      top = distance < 48 ? top + 60 : 160;
    }
    top = Math.floor((top * height) / 650);
    for (let y = 30; y < top; y++) data[y * width + x] = 1;
  }
}
