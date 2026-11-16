import { fixedMultiply, fixedDivide } from "./numeric.js";
const add = (a, b) => (a + b) | 0;
const abs = (value) => {
  const sign = value >> 31;
  return ((value ^ sign) - sign) | 0;
};

// 004CA110. Native screen coordinates increase downwards. Collision receives
// signed 16.16 positions and returns zero or a colliding object's ID.
export function nativeAirForces(body, gravity, wind, collide) {
  let { vx, vy, moving = 0 } = body;
  const g = fixedMultiply(gravity, body.gravityScale);
  if (!g) return { vx, vy, moving, result: 0 };
  if (!vx && !vy && collide(body.x, add(body.y, g < 1 ? -65536 : 65536)))
    return { vx, vy, moving, result: 0 };
  vy = add(vy, g);
  const w = fixedMultiply(wind, body.windScale);
  if (!collide(add(body.x, w < 1 ? -65536 : 65536), body.y)) vx = add(vx, w);
  return {
    vx: fixedMultiply(vx, body.drag),
    vy: fixedMultiply(vy, body.drag),
    moving: 1,
    result: 1,
  };
}

// 004C9AA0: sweep the dominant axis through each crossed pixel boundary,
// querying the secondary axis only when its integer coordinate changes.
export function nativeSweep({ x, y, vx, vy }, fraction, collide, side = 99) {
  const endX = add(x, fixedMultiply(vx, fraction));
  const endY = add(y, fixedMultiply(vy, fraction));
  if (!((x ^ endX) & 0xffff0000) && !((y ^ endY) & 0xffff0000))
    return { x: endX, y: endY, remaining: 0, side, hit: 0 };
  const dx = (endX - x) | 0,
    dy = (endY - y) | 0;
  const vertical = abs(dx) < abs(dy);
  const startMinor = vertical ? x : y;
  const endMajor = vertical ? endY : endX,
    endMinor = vertical ? endX : endY;
  const majorDistance = abs(vertical ? dy : dx),
    minorDelta = vertical ? dx : dy;
  let major = vertical ? y : x,
    minor = startMinor,
    progress = 0;
  const step = major < endMajor ? 65536 : -65536;
  const position = (a, b) => (vertical ? { x: b, y: a } : { x: a, y: b });
  const contact = (a, b, surface, hit) => ({
    ...position(a, b),
    remaining: (fraction - fixedMultiply(fraction, progress)) | 0,
    side: surface,
    hit,
  });
  while (major !== endMajor) {
    const next =
      abs((endMajor - major) | 0) > 65535
        ? add(major, step) & 0xffff0000
        : endMajor;
    let p = position(next, minor);
    let hit = collide(p.x, p.y);
    if (hit) {
      const snapped =
        step < 0 ? major & 0xffff0000 : (major & 0xffff0000) + 65535;
      return contact(
        snapped | 0,
        minor,
        vertical ? (step < 0 ? 1 : 3) : step < 0 ? 4 : 2,
        hit,
      );
    }
    progress = fixedDivide(
      (majorDistance - abs((endMajor - next) | 0)) | 0,
      majorDistance,
    );
    const nextMinor = add(startMinor, fixedMultiply(minorDelta, progress));
    if ((nextMinor ^ minor) & 0xffff0000) {
      p = position(next, nextMinor);
      hit = collide(p.x, p.y);
      if (hit) {
        const negative = endMinor < startMinor;
        const snapped = negative
          ? minor & 0xffff0000
          : (minor & 0xffff0000) + 65535;
        return contact(
          next,
          snapped | 0,
          vertical ? (negative ? 4 : 2) : negative ? 1 : 3,
          hit,
        );
      }
    }
    major = next;
    minor = nextMinor;
  }
  return { x: endX, y: endY, remaining: 0, side, hit: 0 };
}

// 004F4860, simple-body branch (body+0x4c == 0). Coefficients are
// signed 16.16: horizontal restitution, vertical restitution, tangential drag.
// The original also stops the contacted body below the Manhattan-speed cutoff.
export function nativeSimpleBounce(body, other, side) {
  let { vx, vy } = body;
  if (side === 1 || side === 3) {
    vx = fixedMultiply(vx, body.tangent);
    vy = -fixedMultiply(vy, body.restitutionY) | 0;
  } else if (side === 2 || side === 4) {
    vx = -fixedMultiply(vx, body.restitutionX) | 0;
    vy = fixedMultiply(vy, body.tangent);
  }
  const stop = (x, y) =>
    add(abs(x), abs(y)) < 0x6666 ? { vx: 0, vy: 0 } : { vx: x, vy: y };
  return { body: stop(vx, vy), other: stop(other.vx, other.vy) };
}

// 004C9F10: bodies carrying flag 0x400000 can skim the water surface.
// A successful skim emits body virtual event +0x40; otherwise water applies
// drag and a fixed downward acceleration. Collision uses native coordinates.
export function nativeWaterMotion(body, waterY, suppressSkim, collide) {
  let { y, vx, vy, submerged = 0 } = body;
  if (!(body.flags & 0x400000) || y >> 16 <= waterY)
    return { y, vx, vy, submerged, skim: false, result: 0 };
  if (
    !suppressSkim &&
    (Math.imul(abs(vy), 3) | 0) < abs(fixedMultiply(vx, body.skimScale)) &&
    abs(vy) < 0x80000 &&
    abs(vx) > 0x60000 &&
    !collide(body.x, waterY << 16)
  ) {
    return {
      y: waterY << 16,
      vx: fixedMultiply(vx, 0xcccc),
      vy: -vy | 0,
      submerged,
      skim: true,
      result: 0,
    };
  }
  return {
    y,
    vx: fixedMultiply(vx, body.waterDrag),
    vy: add(fixedMultiply(vy, body.waterDrag), 0x4ccc),
    submerged: 1,
    skim: false,
    result: 1,
  };
}
