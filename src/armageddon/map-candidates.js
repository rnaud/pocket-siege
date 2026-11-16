// LANDGEN.EXE 00408C30 / 00409180 / 00409220 / 004092B0.
// Coordinates are original image pixels (positive y down). These routines
// precede natural-object selection; they do not include the terrain-carving fallback.
const cell = (grid, x, y) =>
  x < 0 || y < 0 || x >= grid.width || y >= grid.height
    ? 0
    : grid.cells[y * grid.width + x];
export function nativeCandidateGrid(image) {
  const width = Math.trunc(image.width / 8),
    height = Math.trunc(image.height / 8);
  const cells = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let n = 0;
      for (let dy = 0; dy < 8; dy++)
        for (let dx = 0; dx < 8; dx++)
          if (image.pixels[(y * 8 + dy) * image.width + x * 8 + dx]) n++;
      cells[y * width + x] = n === 64 ? 2 : n ? 1 : 0;
    }
  return { width, height, cells };
}
export function nativeReserveCandidate(grid, x, y, width, height) {
  for (let cy = Math.trunc(y / 8); cy < Math.trunc((y + height + 7) / 8); cy++)
    for (let cx = Math.trunc(x / 8); cx < Math.trunc((x + width + 7) / 8); cx++)
      if (cx >= 0 && cy >= 0 && cx < grid.width && cy < grid.height)
        grid.cells[cy * grid.width + cx] = 3;
}
export function nativeFindMapCandidate(image, grid, settings) {
  const { attempts, width, height, water } = settings;
  let { x, y } = settings;
  const usable = Math.trunc(Math.imul(100 - water, image.height) / 100);
  const middle = Math.trunc(usable / 2),
    bottom = usable - height - 20;
  const half = Math.trunc(width / 2);
  const fits = () => {
    const px = x + half,
      py = y + half + height;
    if (
      px < 0 ||
      py < 0 ||
      px >= image.width ||
      py >= image.height ||
      !image.pixels[py * image.width + px]
    )
      return false;
    for (
      let cy = Math.trunc(y / 8);
      cy < Math.trunc((y + height + 7) / 8);
      cy++
    )
      for (
        let cx = Math.trunc(x / 8);
        cx < Math.trunc((x + width + 7) / 8);
        cx++
      )
        if (cell(grid, cx, cy)) return false;
    return true;
  };
  for (let i = 0; i < attempts; i++) {
    x = (((x + 7) | 0) % (image.width - width - 40)) + 20;
    for (y = middle; y < bottom; y++) if (fits()) return { found: true, x, y };
    for (y = middle; y > 20; y--) if (fits()) return { found: true, x, y };
  }
  return { found: false, x, y };
}
// 00409730 uses full-width bubble passes and swaps equal x values too.
// A stable JS sort would change native order when two points share an x.
export function nativeSortMapCandidates(points) {
  const result = points.map((p) => ({ ...p }));
  for (let pass = 0; pass < result.length; pass++)
    for (let i = 0; i < result.length - 1; i++)
      if (result[i + 1].x <= result[i].x)
        [result[i], result[i + 1]] = [result[i + 1], result[i]];
  return result;
}

// 00409790's non-carving stage (0040988B..00409914). The caller passes
// Landgen's setup RNG, not the frame-dependent match RNG. Returned points
// remain in discovery order until the caller finishes fallback placement.
export function nativeMapCandidateStage(image, grid, water, random) {
  const points = [];
  let x = random() >>> 16,
    y = 0;
  while (points.length < 32) {
    const found = nativeFindMapCandidate(image, grid, {
      x,
      y,
      water,
      width: 40,
      height: 40,
      attempts: 500,
    });
    if (!found.found) break;
    ({ x, y } = found);
    nativeReserveCandidate(grid, x - 30, y - 30, 100, 100);
    points.push({ x: x + 20, y: y + 20 });
  }
  return points;
}
