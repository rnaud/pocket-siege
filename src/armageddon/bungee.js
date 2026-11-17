import { fixedMultiply } from './numeric.js';

// 004F8790. Native coordinates are signed16.16, Y down. The probe uses
// the body's position setter, so accepted probes can update collision state.
export function nativeAutoBungee(input, weapon, height, interfaces = {}) {
  const body = { ...input }, calls = [];
  const invoke = (operation, extra = {}) => {
    calls.push({ operation, ...extra });
    return interfaces[operation]?.(body, extra);
  };
  if (body.enabled && body.field104 && !body.field108 && weapon.type === 4 && weapon.subtype === 7) {
    const { x, y, type } = body;
    let drop = 0;
    const attempt = (x, y) => {
      const accepted = invoke('tryPosition', { request: [x, y] });
      if (accepted) { body.x = x; body.y = y; }
      return accepted;
    };
    while (((y + 0x60000 + drop) >> 16) < height) {
      if (!attempt(x, (y + 0x60000 + drop) | 0)) break;
      drop = (drop + 0x60000) | 0;
      if (drop >= 0x1a40000) break;
    }
    body.type = 2; invoke('type', { value: 2 });
    attempt(x, y);
    body.type = type; invoke('type', { value: type });
    if (((body.minimumDrop - 6) << 16) <= drop) {
      body.bungeeLength = (Math.trunc(Math.imul(drop, 7) / 8) - 0x320000) | 0;
      invoke('activate');
    }
  }
  return { body, calls };
}

// 004F88A0. Keep the original anchor while placing the worm twelve pixels
// below it. A failed constraint returns to idle without spending a shot.
export function nativeAttachBungee(input, interfaces = {}) {
  const body = { ...input }, calls = [];
  const invoke = (operation, extra = {}) => {
    calls.push({ operation, ...extra });
    return interfaces[operation]?.(body, extra);
  };
  const { x, y } = body;
  body.field2a4 = body.field2a8 = 1;
  const nextY = (y + 0xc0000) | 0;
  if (invoke('tryPosition', { request: [x, nextY] })) {
    body.x = x; body.y = nextY;
    if (!invoke('constrain', { request: [x, y] })) {
      body.state = 0x65;
      invoke('state', { value: body.state });
    } else {
      body.state = 0x7c;
      invoke('state', { value: body.state });
      const voice = invoke('voice', { request: [body.team, 5] });
      invoke('sound', { request: [voice, 3, 65536, 65536, 0] });
      body.shots = (body.shots + 1) | 0;
      const request = invoke('launchSetup', { value: 0 });
      invoke('launch', { request });
      invoke('finish');
    }
  }
  return { body, calls };
}

// 004F89D0. The cord has its own length velocity, separate from body motion.
// A rejected resize reverses that velocity before the original damping step.
export function nativeBungeeTick(input, interfaces = {}) {
  const body = { ...input }, calls = [];
  const invoke = (operation, extra = {}) => {
    calls.push({ operation, ...extra });
    return interfaces[operation]?.(body, extra);
  };
  const angle = Math.max(0x6000, Math.min(0xa000, (body.angle + 0x8000) & 65535));
  invoke('progress', { value: Math.imul(body.facing, (angle - 0x6000) * 4) & 65535 });
  body.field1f0 = Math.max(-0x40000, Math.min(0x40000,
    (Math.trunc(((body.bungeeLength - body.length) | 0) / 300) + body.field1f0) | 0));
  const length = (body.length + body.field1f0) | 0;
  if (invoke('resize', { length })) body.length = length;
  else body.field1f0 = Math.trunc(Math.imul(body.field1f0, 6) / -10) | 0;
  body.field1f0 = fixedMultiply(body.field1f0, 0xfeb8);
  if (!body.field104 || body.field108) {
    body.state = 0x65;
    invoke('state', { value: body.state });
  }
  return { body, calls };
}
