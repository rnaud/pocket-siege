// 004FADDB–004FAE51. Twelve-word particle event; visual RNG draws Y first.
export function nativeCasing(sprite, facing, x, y, gravity, random) {
  if (!sprite) return null;
  const vy = (random() & 0xffff) - 0x18000;
  const vx = Math.imul((random() & 0xffff) - 0x18000, facing);
  return [
    0x80000,
    x,
    y,
    0,
    vx,
    vy,
    0,
    gravity,
    sprite + (facing > 0 ? 0x40000 : 0),
    0,
    0xa0000,
    0x1999,
  ];
}
