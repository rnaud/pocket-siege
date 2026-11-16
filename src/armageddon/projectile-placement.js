// 004E1C3B..004E1C87. 004F4000 sets the unplaced body at (0,-1024).
// The placement query uses constructor flags before mode-specific final flags.
export function nativeProjectilePlacement(body, x, y, probe) {
  const origin = { ...body, x: 0, y: -0x4000000 };
  const hit = probe(origin, x, y);
  return hit
    ? { hit, body: origin, calls: [
      { operation: "detonate", request: [x, y] },
      { operation: "delete", request: [1] },
    ] }
    : { hit: 0, body: { ...origin, x, y, sleeping: 0 }, calls: [] };
}
