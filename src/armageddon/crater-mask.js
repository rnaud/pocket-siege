// 00492F10: original bitmap circle rasterizer, centred on integer pixels.
// x87 computes each row width from half-pixel sample positions; the CRT
// conversion truncates. Four symmetric writes include duplicated axes.
export function nativeCirclePixels(radius, setPixel, value = 1) {
  for (let y = 0; y < radius; y++) {
    const width = Math.trunc(Math.sqrt((radius + 0.5) ** 2 - (y + 0.5) ** 2));
    for (let x = 0; x < width; x++) {
      setPixel(-x, -y, value);
      setPixel(x, -y, value);
      setPixel(-x, y, value);
      setPixel(x, y, value);
    }
  }
}

// 004A8E50 generates sixteen hole/rim masks. 004A85F0 selects a mask by
// clamped strength, not a continuous radius. Its bitmap centre is inner+5.
export function nativeCraterMask(strength) {
  const index = Math.trunc((Math.max(0, Math.min(100, strength)) * 15) / 100);
  const inner = Math.trunc((index * 94) / 15) + 6;
  return { index, inner, outer: inner + 5 };
}

// Browser terrain uses upward-positive Y; native coordinates use downward Y.
export function carveNativeCrater(terrain, width, height, x, y, strength, rim) {
  const mask = nativeCraterMask(strength);
  let removed = 0;
  nativeCirclePixels(mask.inner, (dx, dy) => {
    const px = x + dx,
      py = height - (y + dy);
    if (px < 0 || py < 0 || px >= width || py >= height) return;
    const index = py * width + px;
    removed += terrain[index];
    terrain[index] = 0;
  });
  if (rim)
    nativeCirclePixels(mask.outer, (dx, dy) => {
      const px = x + dx,
        py = height - (y + dy);
      if (px < 0 || py < 0 || px >= width || py >= height) return;
      const index = py * width + px;
      if (terrain[index]) rim[index] = 1;
    });
  return removed;
}

// 004AC59E writes the selected palette index only to mask & solid pixels.
export function nativeRimPixel(mask, solid, color, original) {
  return mask && solid ? color : original;
}

// 004A85F0 dispatch plan. Bank0 is the generated hole bitmap; bank1 is its
// rim. 004AC717 clears the separate backing layer before the main hole blit.
export function nativeCraterPlan(strength, x, y, locked = false) {
  if (locked) return [];
  const value = Math.max(0, Math.min(100, strength));
  const { index, outer } = nativeCraterMask(value);
  const output = [
    { bounds: [x - outer, y - outer, x + outer + 1, y + outer + 1] },
  ];
  if (value >= 75) {
    const smaller = Math.trunc((value * 15) / 130);
    const centre = Math.trunc((smaller * 94) / 15) + 11;
    output.push({
      bank: 0,
      index: smaller,
      x: x - centre,
      y: y - centre,
      operation: "0x4ac717",
    });
  }
  output.push(
    { bank: 0, index, x: x - outer, y: y - outer, operation: "0x4ac071" },
    { bank: 1, index, x: x - outer, y: y - outer, operation: "0x4ac59e" },
  );
  return output;
}
