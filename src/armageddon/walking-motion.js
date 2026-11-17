// 004F4D80: horizontal position attempt with an integer-pixel slope search.
// Coordinates and displacement are signed16.16, native Y points downward.
// A drop with no support moves X only; falling physics owns the subsequent Y.
export function nativeWalkPosition(x, y, dx, limit, collide) {
  const nextX = (x + dx) | 0;
  let nextY = y;
  if (collide(nextX, nextY)) {
    for (let step = 0; step < limit; step++) {
      nextY = (nextY - 65536) | 0;
      if (!collide(nextX, nextY)) return { x: nextX, y: nextY, result: 1 };
    }
    return { x, y, result: 0 };
  }
  for (let step = 0; step < limit; step++) {
    if (collide(nextX, (nextY + 65536) | 0)) return { x: nextX, y: nextY, result: 1 };
    nextY = (nextY + 65536) | 0;
  }
  return { x: nextX, y, result: -1 };
}
