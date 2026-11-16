// 004FCD58..004FCDC6. Aim comes from the original launch routine. Unlike
// the old host bat, this rectangle can hit multiple bodies, including allies.
export function nativeBatRequest(record, x, y, vx, vy, facing) {
  return [
    (x + Math.imul(facing, 0x1a0000)) | 0, y,
    0x1a0000, 0x1e0000, record["0x70"],
    Math.trunc(Math.imul(vx, record["0x74"]) / 10) | 0,
    Math.trunc(Math.imul(vy, record["0x74"]) / 10) | 0,
    6, 0x61, 0x2a7, 0x21c4c, 1,
  ];
}
