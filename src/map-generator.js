// Seeded geometry only: the renderer paints the resulting destructible mask.
export const MAP_LAYOUTS = [
  "fern",
  "highlands",
  "archipelago",
  "forts",
  "caverns",
  "bridges",
];
export function generateTerrain(data, width, height, seed, layout) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const anchors = [0, 180, 340, 490, 710, 860, 1020, 1200];
  const heights = anchors.map(() => 240 + Math.floor(random() * 145));
  // Opposing teams get matched starting elevations; seeds vary the shared profile.
  heights[6] = heights[1];
  heights[5] = heights[2];
  heights[4] = heights[3];
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
    if (layout === "caverns") top += 75;
    const bridge = layout === "bridges" && u > 525 && u < 675;
    if (bridge) top = heights[3];
    top = Math.floor((top * height) / 650);
    const cave = cavernBounds(u);
    for (let y = 30; y < top; y++) {
      const v = (y * 650) / height;
      if (bridge && y < top - (12 * height) / 650) continue;
      // Open entrances and wide underground galleries beneath protected spawns.
      if (layout === "caverns" && v > cave.floor && v < cave.roof) continue;
      if (
        layout === "highlands" &&
        Math.abs(v - (150 + 7 * Math.sin(u / 110))) < 30 &&
        (u < 140 || u > 1060)
      )
        continue;
      // Arched undercuts give the outer islands shelter and fragile overhangs.
      if (
        layout === "archipelago" &&
        ((u - 240) / 85) ** 2 + ((v - 155) / 40) ** 2 < 1
      )
        continue;
      if (
        layout === "archipelago" &&
        ((u - 960) / 85) ** 2 + ((v - 155) / 40) ** 2 < 1
      )
        continue;
      data[y * width + x] = 1;
    }
  }
}

// Arched chambers share a walkable floor, with enough headroom throughout.
export function cavernBounds(x) {
  const floor = 145 + 7 * Math.sin(x / 110);
  return { floor, roof: floor + 68 + 26 * (0.5 + 0.5 * Math.cos(x / 95)) };
}
