// 004E0580. Effect constructors and task lookup retain explicit interfaces.
export function nativeCrateDetonation(input, inventory, interfaces) {
  const flameParent = interfaces.parent(23, 0);
  const projectileParent = interfaces.parent(25, 0);
  const body = { ...input, destroyed: 1 };
  const missionStatus = body.variant && body.kind !== 3 ? 4 : 0;
  const sound = id => interfaces.sound([id, 2, 65536, 65536, 0]);
  if (body.kind === 3 && (!body.fuseSeconds || body.fuse)) {
    interfaces.broadcast(20, 0, 0x447, 0x124, [body.recordX, body.recordY]);
    sound(115);
    return { body, missionStatus };
  }
  interfaces.blast([1, body.x, (body.y + 0x100000) | 0, 100, 50, 0]);
  for (const [vx, vy] of [[-0x80000, -0x80000], [0x80000, -0x80000],
    [-0x80000, 0x80000], [0x80000, 0x80000]]) {
    const allocation = interfaces.allocate(0xb8);
    if (allocation) interfaces.flame(allocation, flameParent,
      [body.x, body.y, vx, vy, 0, 4, 1, 3000, 100, 5, 0]);
  }
  sound(59);
  if (body.kind === 1) interfaces.contents(body.weapon, projectileParent);
  if (body.kind === 5)
    for (let slot = 0; slot < 71; slot++)
      if (inventory[slot]) interfaces.contents(slot, projectileParent);
  return { body, missionStatus };
}
