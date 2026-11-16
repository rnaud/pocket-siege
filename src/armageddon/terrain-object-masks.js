// Landgen 3.0: 00405720 builds an 8x8 occupancy grid; 004058D0
// derives its placement constraints using the orientation at object+0x18.
export function nativeTerrainObjectMasks(image, direction) {
  if (!Number.isInteger(direction) || direction < 0 || direction > 3)
    throw new Error("Invalid terrain object direction");
  const width = Math.ceil(image.width / 8),
    height = Math.ceil(image.height / 8);
  const occupancy = new Uint8Array(width * height);
  for (let cy = 0; cy < height; cy++)
    for (let cx = 0; cx < width; cx++) {
      let count = 0;
      for (let dy = 0; dy < 8; dy++)
        for (let dx = 0; dx < 8; dx++) {
          const x = cx * 8 + dx,
            y = cy * 8 + dy;
          if (
            x < image.width &&
            y < image.height &&
            image.pixels[y * image.width + x]
          )
            count++;
        }
      occupancy[cy * width + cx] = count === 64 ? 2 : count ? 1 : 0;
    }
  const placement = occupancy.map((cell) => (cell === 0 ? 1 : 0));
  const breadth = direction >= 2 ? width : height;
  const depth = direction >= 2 ? height : width;
  const index = (x, y) => {
    switch (direction) {
      case 0:
        return x * width + width - y - 1;
      case 1:
        return x * width + y;
      case 2:
        return (height - y - 1) * width + x;
      case 3:
        return y * width + x;
    }
  };
  let row = depth - 1;
  for (
    let n = Math.max(1, (breadth + depth) >> 4);
    n > 0 && row >= 1;
    n--, row--
  )
    for (let x = 0; x < breadth; x++) {
      const i = index(x, row);
      placement[i] = occupancy[i] ? 2 : 1;
    }
  for (
    let n = Math.max(1, (breadth + depth) >> 3);
    n > 0 && row >= 1;
    n--, row--
  )
    for (let x = 0; x < breadth; x++) placement[index(x, row)] = 1;
  return { width, height, occupancy, placement };
}

// 00408CE0: reserved/blocked cells reject every object. Constraint 0 needs
// empty terrain; 2 needs a fully solid cell; 1 accepts any unreserved cell.
export function nativeTerrainObjectFits(mask, grid, x, y) {
  for (let cy = 0; cy < mask.height; cy++)
    for (let cx = 0; cx < mask.width; cx++) {
      const gx = x + cx,
        gy = y + cy;
      const cell =
        gx < 0 || gy < 0 || gx >= grid.width || gy >= grid.height
          ? 0
          : grid.cells[gy * grid.width + gx];
      const constraint = mask.placement[cy * mask.width + cx];
      if (
        cell === 3 ||
        cell & 128 ||
        (constraint === 0 && cell !== 0) ||
        (constraint === 2 && cell !== 2)
      )
        return false;
    }
  return true;
}

// 00408F30 scans one grid cell at a time, rejecting out-of-bounds starts
// immediately. Returns the coordinates passed to the native draw operation.
export function nativeFindTerrainObject(mask, grid, x, y, direction) {
  if (!Number.isInteger(direction) || direction < 0 || direction > 3)
    throw new Error("Invalid terrain scan direction");
  while (
    x >= 0 &&
    y >= 0 &&
    x + mask.width <= grid.width &&
    y + mask.height <= grid.height
  ) {
    if (nativeTerrainObjectFits(mask, grid, x, y)) return { x, y };
    if (direction === 0) x--;
    else if (direction === 1) x++;
    else if (direction === 2) y--;
    else y++;
  }
  return null;
}
