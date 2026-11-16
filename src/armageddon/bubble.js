import { fixedMultiply, nextVisualRandom } from "./numeric.js";

// 004D3190 stores one of four original bubble sprites and its buoyancy.
export function nativeBubble(x, y, vx, vy, size) {
  if (!Number.isInteger(size) || size < 1 || size > 4)
    throw new Error("Invalid bubble size");
  return {
    x: x | 0,
    y: y | 0,
    vx: vx | 0,
    vy: vy | 0,
    buoyancy: (Math.imul(size, 0x9999) + 0x6667) | 0,
    progress: 0,
    sprite: size + 0x33f,
  };
}

// 004D32C0 event 0x3ED: integration, buoyancy, two independent particle RNG
// draws, damping, then surface retirement. Progress is externally driven.
export function nativeBubbleTick(input, seed, waterY) {
  const bubble = { ...input };
  bubble.x = (bubble.x + bubble.vx) | 0;
  bubble.y = (bubble.y + bubble.vy) | 0;
  bubble.vy = (bubble.vy - fixedMultiply(0x4ccc, bubble.buoyancy)) | 0;
  seed = nextVisualRandom(seed);
  bubble.vx = (bubble.vx + (seed & 65535) - 0x8000) | 0;
  seed = nextVisualRandom(seed);
  bubble.vy = (bubble.vy + (seed & 65535) - 0x8000) | 0;
  bubble.vx = fixedMultiply(bubble.vx, 0xcccc);
  bubble.vy = fixedMultiply(bubble.vy, 0xcccc);
  const alive = waterY < bubble.y >> 16;
  if (alive) bubble.progress = (bubble.progress + 0x189) | 0;
  return { bubble, seed, alive };
}
