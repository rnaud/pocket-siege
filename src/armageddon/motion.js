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
// 004D1260: virtual +0x100 attempts a position change through the manager.
// The manager predicate returns a hit ID; this method returns 1 on CLEAR.
export function nativeTryBodyPosition(body, x, y, collide) {
  if (collide(x, y))
    return { x: body.x, y: body.y, sleeping: body.sleeping, result: 0 };
  return { x, y, sleeping: 0, result: 1 };
}

// 004F4700 with the real +0x100 movement method. Complex bodies try stepping
// one pixel up, then down, at the leading edge. Successful movement damps vx;
// only two rejected moves reflect velocity. Position and sleep changes matter.
export function nativeComplexBounce(body, side, collide) {
  let { vx, vy } = body;
  let position = { x: body.x, y: body.y, sleeping: body.sleeping };
  if (side === 1 || side === 3) {
    vx = fixedMultiply(vx, body.tangent);
    vy = -fixedMultiply(vy, body.restitutionY) | 0;
  } else if (side === 2 || side === 4) {
    const x = add(body.x, vx < 0 ? -65536 : 65536);
    let attempt = nativeTryBodyPosition(body, x, add(body.y, -65536), collide);
    if (!attempt.result)
      attempt = nativeTryBodyPosition(body, x, add(body.y, 65536), collide);
    if (attempt.result) {
      position = { x: attempt.x, y: attempt.y, sleeping: attempt.sleeping };
      vx = fixedMultiply(vx, Math.trunc(Math.imul(body.tangent, 30) / 32));
    } else {
      vx = -fixedMultiply(vx, body.restitutionX) | 0;
      vy = fixedMultiply(vy, body.tangent);
    }
  }
  return { ...position, vx, vy };
}

export function nativeSimpleBounce(body, other, side, collide) {
  let { vx, vy } = body;
  let position = {};
  if (body.complex) {
    ({ vx, vy, ...position } = nativeComplexBounce(body, side, collide));
  } else if (side === 1 || side === 3) {
    vx = fixedMultiply(vx, body.tangent);
    vy = -fixedMultiply(vy, body.restitutionY) | 0;
  } else if (side === 2 || side === 4) {
    vx = -fixedMultiply(vx, body.restitutionX) | 0;
    vy = fixedMultiply(vy, body.tangent);
  }
  const stop = (x, y) =>
    add(abs(x), abs(y)) < 0x6666 ? { vx: 0, vy: 0 } : { vx: x, vy: y };
  return {
    body: { ...position, ...stop(vx, vy) },
    other: stop(other.vx, other.vy),
  };
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

// 004CA320 simple-body path, without earthquake impulses. Collision masks are
// supplied by the caller; response callbacks may update the body in place.
export function nativeSimpleBodyTick(input, environment, callbacks) {
  const body = { ...input };
  if (!body.enabled || body.suspended) return body;
  const awake = () => callbacks.awake(body);
  if (((environment.frame + environment.index) | 0) % 13 === 0 || awake())
    body.sleeping = 0;
  if (body.sleeping) return body;
  const wasSubmerged = body.submerged;
  body.submerged = 0;
  body.contact = 0;
  body.moving = 0;
  const water = nativeWaterMotion(
    body,
    environment.waterY,
    wasSubmerged,
    callbacks.collide,
  );
  Object.assign(body, {
    y: water.y,
    vx: water.vx,
    vy: water.vy,
    submerged: water.submerged,
  });
  if (water.skim) callbacks.skim?.(body);
  if (!water.result) {
    const force = nativeAirForces(
      body,
      environment.gravity,
      environment.wind,
      callbacks.collide,
    );
    Object.assign(body, { vx: force.vx, vy: force.vy, moving: force.moving });
  }
  if (body.submerged !== wasSubmerged) callbacks.waterChanged?.(body);
  let remaining = 65536;
  for (let i = 0; i < 2 && remaining; i++) {
    const sweep = nativeSweep(body, remaining, callbacks.collide);
    body.x = sweep.x;
    body.y = sweep.y;
    remaining = sweep.remaining;
    if (sweep.hit) callbacks.bounce(body, sweep.hit, sweep.side);
  }
  if (body.radius) {
    const vertical = Math.trunc(abs(body.vy) / 3);
    const denominator = fixedMultiply(body.radius, 0x6487e);
    body.angularVelocity =
      abs(body.vx) < vertical
        ? (body.vx < 0
            ? -fixedDivide(vertical, denominator)
            : fixedDivide(vertical, denominator)) | 0
        : fixedDivide(body.vx, denominator);
    body.angle = add(body.angle, body.angularVelocity);
  }
  body.vx = Math.max(-0x200000, Math.min(0x200000, body.vx));
  body.vy = Math.max(-0x200000, Math.min(0x200000, body.vy));
  if (!body.vx && !body.vy && callbacks.collide(body.x, add(body.y, 65536)))
    body.moving = 0;
  if (!awake()) body.sleeping = 1;
  return body;
}

// 004D11E0, projectile vtable +0xf4: any motion/contact/water flag wakes it.
export function nativeBodyAwake(body) {
  return Number(
    Boolean(
      body.vx || body.vy || body.submerged || body.contact || body.moving,
    ),
  );
}
