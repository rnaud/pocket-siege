// 004B81B0, one 20ms team-task update. Contents are selected without
// replacement; exhausted pools refill in selection order. Placement,
// allocation and crate construction retain their separate native interfaces.
export function nativeCrateShowerTick(input, interfaces) {
  const body = { ...input, pool: [...input.pool], used: [...input.used] };
  const parent = interfaces.parent(25, 0);
  if (!body.count) return body;
  interfaces.busy();
  body.timer = (body.timer - 20) | 0;
  if (body.timer > 0) return body;
  body.timer = 4000;
  const position = interfaces.place(1, 1);
  if (!position) { body.count = 0; return body; }
  const random = interfaces.nextRandom();
  // Native DIV faults before its nominal zero guard. A valid scheme must
  // supply a nonempty content pool; don't silently invent fallback contents.
  if (!body.pool.length) throw new RangeError("Crate Shower requires a nonempty content pool");
  const index = ((random >>> 8) & 0xffff) % body.pool.length;
  const weapon = body.pool[index];
  body.used.push(weapon);
  body.pool[index] = body.pool[body.pool.length - 1];
  body.pool.pop();
  if (!body.pool.length) {
    body.pool = body.used;
    body.used = [];
  }
  const record = { x: position.x, y: position.y, kind: 1,
    ammo: interfaces.ammo(weapon), weapon };
  const allocation = interfaces.allocate(0x274);
  if (allocation) interfaces.create(allocation, parent, record, 1);
  interfaces.busy();
  body.count = (body.count - 1) | 0;
  return body;
}
