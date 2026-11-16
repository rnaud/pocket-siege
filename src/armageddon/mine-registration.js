//004E9A40: 24 slots, first empty slot or the first oldest signed frame.
export function nativeMineRegistration(slots, frame, color) {
  let slot = slots.findIndex((entry) => entry === null);
  const calls = [];
  if (slot < 0) {
    slot = 0;
    for (let i = 1; i < 24; i++)
      if ((slots[i].frame | 0) < (slots[slot].frame | 0)) slot = i;
    const old = slots[slot];
    calls.push({
      operation: "effect",
      request: [
        0,
        old.x,
        old.y,
        0,
        0,
        0,
        0,
        0,
        0x30a + (color & 255),
        0,
        65536,
        0xccc,
      ],
    });
    calls.push({ operation: "delete", request: [1] });
  }
  return { slot, registeredFrame: frame | 0, calls };
}
