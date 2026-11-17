import { nativeSin, nativeCos } from './trig.js';

// Original004F8230. Coordinates are signed16.16, Y down. Raycast returns
// integer distance. +100 tries a body position; +CC (004F51A0) attempts a
// rope constraint, not another position move. Both remain explicit interfaces.
export function nativeRopeShotTick(input, interfaces = {}) {
  const body = { ...input }, calls = [];
  const invoke = (operation, extra = {}) => {
    calls.push({ operation, ...extra });
    return interfaces[operation]?.(body, extra);
  };
  const result = () => ({ body, calls });
  if (!body.ropeFiring) return result();
  const magnitude = body.vy < 0 ? -body.vy | 0 : body.vy;
  if (![0x70,0x73,0x77,0x79,0x7a,0x7e].includes(body.state) &&
      (!body.field104 || body.field108 || magnitude >= 0x80000)) {
    body.ropeFiring = 0; return result();
  }
  body.ropeProgress = (body.ropeProgress + 20) | 0;
  if (body.ropeLength <= body.ropeProgress) {
    body.ropeFiring = 0; return result();
  }
  const x = body.x, y = body.y;
  const dx = nativeSin(body.ropeAngle), dy = nativeCos(body.ropeAngle);
  const distance = invoke('ray', { request: [x >> 16, y >> 16, dx, dy, body.ropeProgress] });
  if (distance < 0) return result();
  body.ropeFiring = 0;
  const anchorX = (x + Math.imul(dx, distance)) | 0;
  const anchorY = (y + Math.imul(dy, distance)) | 0;
  invoke('sound', { request: [87, 3, 65536, 65536, 0] });
  const attempt = (px, py) => {
    px |= 0; py |= 0;
    const accepted = invoke('tryPosition', { request: [px, py] });
    if (accepted) { body.x = px; body.y = py; }
    return accepted;
  };
  for (const oy of [-65536, 0, 65536]) {
    for (const ox of [-65536, 0, 65536]) {
      attempt(x + ox, y + oy);
      if (!invoke('attach', { request: [anchorX, anchorY] })) continue;
      invoke('markAttached', { request: [body.team, body.worm, 1] });
      if (body.ropeRemaining > 0) body.ropeRemaining--;
      invoke('clearBlocked', { request: [body.team, body.worm, 0] });
      body.state = 0x7b;
      invoke('state', { value: 0x7b });
      if (!body.ropeActive) {
        body.shots = (body.shots + 1) | 0;
        invoke('event', { request: [20, 0, 0x431, 0x124], data: [
          body.team, body.worm, body.shots, body.shotLimit,
          body.field2a4, body.field2a8, 0, body.weapon,
        ] });
        invoke('finish');
      }
      body.ropeActive = 1;
      return result();
    }
  }
  attempt(x, y);
  return result();
}
