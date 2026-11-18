//004CC310 selects the aligned mask plane;004CC0C0 intersects packed words.
// Bitmap resource getters remain host interfaces. Read their results in native
// order so storage replacement during a getter is visible to the word scan.
export function nativeCollisionOverlapMemory(
  memory,
  a,
  ax,
  ay,
  b,
  bx,
  by,
  host,
) {
  const dx = (bx - ax) | 0,
    dy = (by - ay) | 0;
  if (memory.get(a + 4)) {
    const x = (memory.get(b + 20) - memory.get(a + 20) - dx) | 0;
    const y = (memory.get(b + 24) - memory.get(a + 24) - dy) | 0;
    const shifted = memory.get(a + 28 + (x & 31) * 4);
    return nativeCollisionWordsMemory(
      memory,
      memory.get(b + 28),
      x & ~31,
      y,
      shifted,
      host,
    );
  }
  const x = (dx - memory.get(b + 20) + memory.get(a + 20)) | 0;
  const y = (dy - memory.get(b + 24) + memory.get(a + 24)) | 0;
  if (memory.get(b + 4)) {
    const shifted = memory.get(b + 28 + (x & 31) * 4);
    return nativeCollisionWordsMemory(
      memory,
      memory.get(a + 28),
      x & ~31,
      y,
      shifted,
      host,
    );
  }
  return host.bitmapBlit(
    memory.get(a + 28),
    x,
    y,
    memory.get(b + 12),
    memory.get(b + 16),
    memory.get(b + 28),
    0,
    0,
    5,
  );
}

export function nativeCollisionWordsMemory(memory, a, x, y, b, host) {
  const [bw, bh] = host.bitmapDimensions(b);
  const [aw, ah] = host.bitmapDimensions(a);
  const right = (bw + x) | 0,
    bottom = (bh + y) | 0;
  if (x >= aw || right <= 0 || y >= ah || bottom <= 0) return 0;
  const left = Math.max(0, x),
    top = Math.max(0, y);
  const endX = (Math.min(aw, right) + 31) & ~31;
  const endY = Math.min(ah, bottom);
  const [bp, , bs] = host.bitmapStorage(b);
  const [ap, , as] = host.bitmapStorage(a);
  const strideA = (as >> 2) << 2,
    strideB = (bs >> 2) << 2;
  for (let row = endY - 1; row >= top; row--) {
    const offsetA = Math.imul(row, strideA),
      offsetB = Math.imul((row - y) | 0, strideB);
    for (let col = left & ~31; col < endX; col = (col + 32) | 0) {
      const wordB = memory.get((bp + offsetB + (((col - x) & ~24) >> 3)) >>> 0);
      const wordA = memory.get((ap + offsetA + ((col & ~24) >> 3)) >>> 0);
      if (wordA & wordB) return 1;
    }
  }
  return 0;
}
