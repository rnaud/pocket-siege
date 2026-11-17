// 004D3F30. A fully blocked seven-pixel search reverses propagation
// direction and still constructs at the input position.
export function nativeFlameSpread(input, interfaces) {
  const record = [...input];
  const parent = interfaces.parent(23, 0);
  const x = (Math.imul((interfaces.random() & 3) + 3, record[4]) + (record[0] >> 16)) | 0;
  const y = record[1] >> 16;
  let offset = 0;
  for (; offset < 7; offset++) {
    if (!interfaces.collide(x, y - offset)) {
      record[0] = x << 16;
      record[1] = (y - offset) << 16;
      break;
    }
  }
  if (offset === 7) record[4] = -record[4] | 0;
  const allocation = interfaces.allocate(0xb8);
  if (allocation) interfaces.flame(allocation, parent, record);
  return record;
}

// 004D3E90: reuse the first hole, otherwise evict the earliest signed
// creation frame. Equal timestamps retain the first slot.
export function registerNativeFlame(pool, body, frame, remove) {
  let slot = -1;
  for (let i = 0; i < 200; i++) {
    if (!pool[i]) { slot = i; break; }
  }
  if (slot < 0) {
    slot = 0;
    for (let i = 1; i < 200; i++)
      if ((pool[i].created | 0) < (pool[slot].created | 0)) slot = i;
    remove(pool[slot], 1);
  }
  pool[slot] = body;
  body.created = frame;
  body.slot = slot;
  return slot;
}
