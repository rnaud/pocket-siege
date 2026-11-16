// 004E1830, numeric body setup at 004E1ACB..004E1CD0. The caller supplies
// the selected primary/secondary projectile configuration and base-body fields.
// Percentages use signed shifts and truncation, not floating multiplication.
const percent = (value) => Math.trunc((value << 16) / 100) | 0;
export function nativeProjectileBody(base, config, payload, frictionByte) {
  const body = {
    ...base,
    mass: 65536,
    flags: config.flags | 2,
    vx: payload.vx,
    vy: payload.vy,
    restitutionX: 0x9999,
    facing: 1,
    launchY: payload.y,
  };
  if (config.mode === 2) {
    body.restitutionY = percent(config.bounce);
    body.tangent = percent(
      Math.trunc(Math.imul(frictionByte & 255, config.friction) / 100),
    );
  } else if (config.mode === 3 || config.mode === 4) {
    if (payload.vx < 0) body.facing = -1;
    body.restitutionY = 0;
    body.tangent = 0;
    if (config.mode === 4) {
      body.restitutionX = 0;
      if (payload.repeat) {
        body.vx = body.facing << 17;
        body.launchY = (payload.y - 0x80000) | 0;
        body.vy = -0x80000;
      }
    }
  }
  body.drag = percent(config.drag);
  body.windScale = percent(config.wind);
  body.gravityScale = percent(config.gravity);
  body.complex = 0;
  body.enabled = 1;
  // Placement rejection/destruction is handled by the caller. This result is
  // the accepted placement branch; mode 4 also requests a native terrain event.
  body.x = payload.x;
  body.y = body.launchY;
  body.sleeping = 0;
  if (config.mode === 1) body.flags = config.flags;
  else if (config.mode === 2 || config.mode === 3)
    body.flags = config.flags | config.collisionFlags;
  else if (config.mode === 4) body.flags = config.flags | 0x400002;
  return body;
}

// 004E1908..004E1A18. The 94-word projectile block begins at weapon+0x74.
// Preserve every selected word so later event/damage/visual ports use the same
// native configuration. Sound and owner-event requests are returned to callers.
export function nativeProjectileSelection(block, payload) {
  const offset = payload.repeat ? 52 : 3;
  const words = block.slice(offset, offset + 42).map((value) => value | 0);
  if (words.length !== 42) throw new RangeError("Incomplete projectile record");
  const sounds = [];
  if (payload.repeat) {
    const numerator = (payload.repeat - 1) | 0;
    if (!words[5] || (numerator === -2147483648 && words[5] === -1))
      throw new RangeError("Invalid native secondary sprite divisor");
    words[6] = (words[6] + (numerator % words[5])) | 0;
  } else if (block[46]) sounds.push([block[46] | 0, 5, 65536, 65536, 0]);
  const ownerEvent = words[22] && payload.owner ? payload.owner | 0 : null;
  if (!words[17]) words[17] = payload.timer | 0;
  if (words[23] === 2 && !words[25]) words[25] = payload.bounce | 0;
  return {
    words,
    sounds,
    ownerEvent,
    config: {
      flags: words[0],
      drag: words[12],
      wind: words[13],
      gravity: words[15],
      mode: words[23],
      collisionFlags: words[24],
      bounce: words[25],
      friction: words[26],
    },
  };
}
