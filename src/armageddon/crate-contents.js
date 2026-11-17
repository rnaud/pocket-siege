// 004E02E0 and classifier004AA9B0. The context's direction bag belongs
// to the match, not the crate; selection consumes logic RNG before allocation.
export function nativeCrateContents(body, weapon, allContents, bag, interfaces) {
  const pool = [...bag.pool], used = [...bag.used];
  const sound = id => interfaces.sound([id, 2, 65536, 65536, 0]);
  if (!allContents && ![23, 24, 25, 50].includes(weapon)) {
    const id = { 4: 51, 43: 104, 45: 61, 52: 49, 53: 65, 54: 102 }[weapon];
    if (id !== undefined) sound(id);
    return { pool, used };
  }
  const random = interfaces.random();
  if (!pool.length) throw new RangeError('Native crate contents direction bag is empty');
  const index = ((random >>> 8) & 0xffff) % pool.length;
  const direction = pool[index];
  used.push(direction);
  pool[index] = pool.at(-1);
  pool.pop();
  if (!pool.length) { pool.push(...used); used.length = 0; }
  const record = [0, 0, body.x, body.y, direction === 0 ? 0x18000 : -0x18000,
    -0x80000, 0x3c00000, 0x15c0000, 0, 0, 0];
  const parent = interfaces.parent(25, 0);
  const allocation = interfaces.allocate(0x3e0);
  if (allocation) interfaces.projectile(allocation, parent, 0x1b5f4, record);
  sound(50);
  return { pool, used };
}
