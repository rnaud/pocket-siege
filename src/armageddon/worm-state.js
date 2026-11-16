// Common body preparation in 004D7730, ending at 004D7A65 before the
// state-specific animation/action entry. Unknown worm fields retain offsets.
// Exit handlers and external sound/manager effects are returned for dispatch;
// their internal mutations are outside this routine's contract.
export function nativeWormTransitionBody(input, next, environment) {
  const body = { ...input };
  const calls = [];
  const previous = body.state;
  if ([0x71, 0x72, 0x75].includes(previous))
    calls.push({ operation: "exit", state: previous });
  if (previous === 0x78) body.field240 = body.field244 = 0;
  if (next === 0x88 || previous === 0x88) {
    body.complex = next === 0x88 ? 0 : 1;
    body.restitutionY = next === 0x88 ? 0x9999 : 0;
    if (body.soundHandle)
      calls.push({ operation: "stopSound", handle: body.soundHandle });
    calls.push({
      operation: "sound",
      request: [next === 0x88 ? 0x18 : 0x19, 3, 65536, 65536, 0],
    });
    body.soundHandle = environment.soundHandle;
  }
  if (next === 0x79) body.complex = 0;
  else if (previous === 0x79) body.complex = 1;
  if (next === 0x6c) body.flags &= ~4;
  else if (previous === 0x6c) body.flags |= 4;
  if (next === 0x7d)
    body.windScale = Math.trunc((environment.weapon70 << 16) / 100);
  else if (previous === 0x7d) body.windScale = 0;
  if ([0x6d, 0x75].includes(next)) {
    body.suspended = 1;
    body.enabled = 0;
    body.flags = 0x400000;
  } else if ([0x6d, 0x75].includes(previous)) {
    body.suspended = 0;
    body.enabled = 1;
    body.flags = body.savedFlags;
  }
  if (next === 0x7b || next === 0x7c) {
    body.field2ec = 0;
    const alternate = next === 0x7b && environment.ropeMode !== 0;
    body.field08c = alternate ? 0x2147 : 0x3ae1;
    body.complexDrag = alternate ? 0xfc28 : 0xfeb8;
  } else if (body.constraint || previous === 0x78) {
    body.field15c = environment.schemeByte;
    if (body.constraint) {
      calls.push({
        operation: "freeConstraint",
        handle: body.constraintHandle,
      });
      body.constraintHandle = 0;
      body.constraint = 0;
    }
  }
  body.drag = next === 0x7d ? 0xcccc : 65536;
  if (next === 0x6f) {
    body.suspended = 1;
    body.enabled = 0;
    body.vx = body.vy = 0;
  } else if (previous === 0x6f) {
    body.suspended = 0;
    body.enabled = 1;
    body.field210 = 0;
  }
  let type = 2;
  if (
    (next >= 0x68 && next <= 0x76 && next !== 0x73) ||
    (next >= 0x7e && next <= 0x85) ||
    next === 0x87
  )
    type = 3;
  if ([0x73, 0x7b, 0x7c].includes(next)) type = 5;
  if ([0x78, 0x79].includes(next)) type = 4;
  if (next === 0x88) type = 6;
  if (body.type !== type) {
    calls.push({ operation: "removeBody", type: body.type });
    body.type = type;
    calls.push({ operation: "addBody", type });
  }
  if (next !== 0x76) body.field250 = 0;
  if ([0x84, 0x85, 0x87].includes(next)) body.field140 = 1;
  if (![0x6f, 0x77, 0x79, 0x7a, 0x7e].includes(next) && !body.field104)
    body.field154 = 0;
  return { body, calls };
}

// 004D7D58..004D7F15: state-specific entry for 0x79 and 0x7a, after
// common body preparation. Voice lookup and playback remain explicit effects.
export function nativeWormJumpLandingEntry(input, next, environment) {
  if (next !== 0x79 && next !== 0x7a)
    throw new RangeError("Unsupported jump/landing entry state");
  const body = { ...input };
  const calls = [{ operation: "clear" }];
  let sprite,
    sound,
    strength = 65536,
    voiceSlot;
  if (next === 0x79) {
    sprite = body.field2b4 === 0 ? 0x16 : 0x19;
    if (body.field2b0 > 0) voiceSlot = 0x19;
    else if (body.field2b4 === 0) voiceSlot = 0x1a;
    else sound = 0x3f;
  } else {
    const sign = body.vy >> 31;
    const speed = ((body.vy ^ sign) - sign) | 0;
    sprite =
      body.state === 0x7d
        ? 0x82
        : environment.previousSprite === 0x1a9
          ? 0x1aa
          : speed < 0x60000
            ? 0x1a
            : 0x1d;
    sound = 0x23;
    strength = Math.trunc(speed / 8);
    body.field19c = 1;
  }
  calls.push({ operation: "queue", sprite_id: sprite, progress: 0 });
  if (voiceSlot !== undefined) {
    calls.push({ operation: "voice", team: body.team, slot: voiceSlot });
    sound = environment.voiceId;
  }
  if (body.soundHandle)
    calls.push({ operation: "stopSound", handle: body.soundHandle });
  calls.push({ operation: "sound", request: [sound, 3, 65536, strength, 0] });
  body.soundHandle = environment.soundHandle;
  return { body, calls };
}
