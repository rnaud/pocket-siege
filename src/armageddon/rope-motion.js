import { nativeSin, nativeCos } from "./trig.js";
import { fixedMultiply, fixedDivide } from "./numeric.js";

// Original004CA8A0: one constrained-body movement pass. Terrain point and
// body collision queries remain interfaces. Remaining time is updated only
// on the same native branches; an unwrap leaves it unchanged for a retry.
export function nativeRopeMotion(input, remaining, interfaces = {}) {
  return nativeRopeMotionInPlace(
    { ...input, segments: [...input.segments] },
    remaining,
    interfaces,
  );
}

// Shared solver for ordinary value bodies and addressed native-memory views.
export function nativeRopeMotionInPlace(body, remaining, interfaces = {}) {
  const calls = [],
    points = [];
  const done = (hit = 0) => ({ body, remaining, hit, calls });
  const invoke = (operation, request) => {
    calls.push({ operation, request });
    return interfaces[operation]?.(...request, body) ?? 0;
  };
  let x = body.anchorX,
    y = body.anchorY,
    angle = 0;
  for (let i = 0; i < body.segmentCount; i++) {
    angle = (angle + body.segments[i * 2 + 1]) | 0;
    points.push({ x, y, angle });
    x = (x + Math.imul(nativeSin(angle), 8)) | 0;
    y = (y - Math.imul(nativeCos(angle), 8)) | 0;
  }
  let speed =
    (fixedMultiply(body.vx, nativeCos(angle)) +
      fixedMultiply(body.vy, nativeSin(angle))) |
    0;
  if (!speed) {
    body.vx = body.vy = 0;
    remaining = 0;
    return done();
  }
  speed = Math.max(-0x100000, Math.min(0x100000, speed));
  const sign = speed < 0 ? -1 : 1;
  let pivot = body.segmentCount - 1;
  let free =
    (body.length - Math.imul(Math.trunc((body.length >> 16) / 8), 0x80000)) | 0;
  while (pivot > 0 && !body.segments[(pivot - 1) * 2]) {
    pivot--;
    free = (free + 0x80000) | 0;
  }
  if (free <= 65536) {
    remaining = 0;
    return done();
  }
  const change = Math.max(
    -0x1999,
    Math.min(0x1999, fixedDivide(speed, fixedMultiply(0x6487e, free))),
  );
  const steps = (Math.abs(speed) >> 16) + 1;
  let acceptedFraction = 0;
  const consume = () => {
    remaining = (remaining - fixedMultiply(remaining, acceptedFraction)) | 0;
  };
  for (let step = 1; step <= steps; step++) {
    const fraction = Math.trunc((step << 16) / steps);
    const nextAngle = (angle + fixedMultiply(change, fraction)) | 0;
    const previousAngle = pivot ? points[pivot - 1].angle : 0;
    if (
      pivot &&
      body.segments[(pivot - 1) * 2] !== sign &&
      ((angle <= previousAngle && previousAngle < nextAngle) ||
        (previousAngle <= angle && nextAngle < previousAngle))
    ) {
      body.segments[pivot * 2 + 1] = 0;
      body.segments[(pivot - 1) * 2] = 0;
      return done();
    }
    let px = points[pivot].x,
      py = points[pivot].y;
    for (let segment = pivot; segment < body.segmentCount - 1; segment++) {
      px = (px + Math.imul(nativeSin(nextAngle), 8)) | 0;
      py = (py - Math.imul(nativeCos(nextAngle), 8)) | 0;
      if (invoke("terrain", [px >> 16, py >> 16])) {
        body.segments[segment * 2] = sign;
        consume();
        return done();
      }
    }
    px = (points[pivot].x + fixedMultiply(nativeSin(nextAngle), free)) | 0;
    py = (points[pivot].y - fixedMultiply(nativeCos(nextAngle), free)) | 0;
    const hit = invoke("collide", [px, py]);
    if (hit) {
      consume();
      return done(hit);
    }
    body.segments[pivot * 2 + 1] = (nextAngle - previousAngle) | 0;
    body.vx = fixedMultiply(nativeCos(nextAngle), speed);
    body.vy = fixedMultiply(nativeSin(nextAngle), speed);
    body.x = px;
    body.y = py;
    acceptedFraction = fraction;
  }
  remaining = 0;
  return done();
}
