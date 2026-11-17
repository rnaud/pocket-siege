// 004E3030. Emit the original flame record after the projectile's blast.
export function nativeProjectileFire(body, x, y, interfaces) {
  const parent = interfaces.parent(23, 0);
  const record = [x, y, 0, 0x40000, 0, 8, 1, body.lifetime,
    body.delay, Math.trunc(body.count / 2), body.persistent];
  const allocation = interfaces.allocate(0xb8);
  if (allocation) interfaces.flame(allocation, parent, record);
  interfaces.sound([59, 5, 65536, 65536, 0]);
}
