// 004D1660. Barrel fire lives longer and spreads farther than crate fire.
export function nativeBarrelDetonation(x, y, interfaces) {
  const parent = interfaces.parent(23, 0);
  interfaces.blast([1, x, y, 100, 50, 0]);
  for (const [vx, vy] of [[-0x80000, -0x80000], [0x80000, -0x80000],
    [-0x80000, 0x80000], [0x80000, 0x80000]]) {
    const allocation = interfaces.allocate(0xb8);
    if (allocation) interfaces.flame(allocation, parent,
      [x, y, vx, vy, 0, 4, 1, 5000, 100, 15, 0]);
  }
  interfaces.sound([59, 5, 65536, 65536, 0]);
}
