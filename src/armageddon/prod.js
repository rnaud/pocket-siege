import { nativeSin, nativeCos } from "./trig.js";

// 004FC4D0. Twelve-word direct area request; no damage by default. Facing
// changes the origin and horizontal impulse, not the record's fixed angle.
export function nativeProdRequest(record, x, y, facing) {
  const angle = Math.trunc((record["0x78"] << 16) / 360);
  const push = record["0x74"];
  return [
    (x + Math.imul(facing, 0x60000)) | 0, y,
    0xc0000, 0xc0000, record["0x70"],
    Math.imul(Math.trunc(Math.imul(nativeSin(angle), push) / 10), facing),
    Math.trunc(Math.imul(nativeCos(angle), push) / -10) | 0,
    0, 0, 0, 0xc4c, 1,
  ];
}
