// 004E3870, every projectile frame: once its gas flag (+0x3A4) is set and it
// is not sunk (+0x110), the projectile releases one gas cloud (004D37D0) 4 px
// behind it (+0x3C8 is its walking direction) and 4 px lower, carrying the
// record's amount (+0x364). The delay (+0x360, from record word 35 of the
// selected block) then counts down by 20 and, on reaching zero, sets the flag.
// Of the default weapons only Skunk's secondary block sets a delay: 1, poison 5.
export function nativeProjectileGas(input, { x, y, facing, sunk }) {
  const body = { ...input }, calls = [];
  if (body.emitting && !sunk)
    calls.push({ operation: "gas", request: [(x - (facing << 18)) | 0, (y + 0x40000) | 0, body.amount | 0] });
  if (body.delay) {
    body.delay = (body.delay - 20) | 0;
    if (body.delay <= 0) { body.delay = 0; body.emitting = 1; }
  }
  return { body, calls };
}
