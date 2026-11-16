import { nativeBodyImpulse } from "./jump.js";
//004EA070 forwards event433 to004F4410, which only applies packet impulse.
export function nativeMineHit(body, packet) {
  const { vx, vy, angularVelocity } = nativeBodyImpulse(
    body,
    packet[3],
    packet[4],
    0,
  );
  return { ...body, vx, vy, angularVelocity };
}

export function nativeMineHitBodies(mines) {
  return mines
    .filter((mine) => mine.nativeBody)
    .map((mine) => ({
      x: mine.nativeBody.x,
      y: mine.nativeBody.y,
      type: mine.nativeBody.type,
      self: false,
      blocked: Boolean(
        mine.nativeBody.vx ||
        mine.nativeBody.vy ||
        mine.nativeBody.submerged ||
        mine.nativeBody.contact ||
        mine.nativeBody.moving,
      ),
      mine,
    }));
}
