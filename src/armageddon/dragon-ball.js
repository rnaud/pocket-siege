import { nativeSin, nativeCos } from "./trig.js";

// 004D34D0. Preserve registry order, native category filtering and signed
// absolute-value overflow. The first matching receiver ends the scan.
export function nativeDragonBallHit(body, receivers) {
  const abs32 = value => { const sign = value >> 31; return ((value ^ sign) - sign) | 0; };
  for (let index = 0; index < receivers.length; index++) {
    const receiver = receivers[index];
    const category = 1 << (receiver.type & 31);
    if (!(category & 0x21c0c)) continue;
    if (abs32((body.x - receiver.x) | 0) >= 0x40000 ||
        abs32((body.y - receiver.y) | 0) >= 0x140000) continue;
    const angle = Math.trunc((body.angle << 16) / 360);
    return { hit: 1, calls: [
      { operation: "damage", receiver: index, event: 0x433, size: 0x124, request: [
        5, body.x, body.y,
        Math.trunc(Math.imul(nativeSin(angle), body.push) / (body.direction < 0 ? -10 : 10)) | 0,
        Math.trunc(Math.imul(nativeCos(angle), body.push) / -10) | 0,
        body.damage,
      ] },
      { operation: "sound", request: [body.sound, 5, 65536, 65536, 0] },
    ] };
  }
  return { hit: 0, calls: [] };
}

// 004D3660: Dragon Ball task events. Position, direction and progress are
// native fixed-point values. Hit scanning (004D34D0) remains a supplied interface.
export function nativeDragonBallEvent(input, event, bounds, interfaces = {}) {
  const body = { ...input }, calls = [];
  const remove = () => calls.push({ operation: "delete", request: [1] });
  if (event === 0x3ea) {
    body.progress = (body.progress + 0x1999) | 0;
    body.x = (body.x + Math.imul(body.direction, 6)) | 0;
    if (body.remaining !== 0) {
      body.remaining = (body.remaining - 20) | 0;
      if (body.remaining < 1) body.remaining = 0;
      if (body.remaining !== 0) {
        calls.push({ operation: "hit" });
        if (!interfaces.hit?.(body)) {
          const request = [body.x >> 16, body.y >> 16];
          calls.push({ operation: "terrain", request });
          if (!interfaces.solid?.(...request)) {
            if (((bounds.left - 0x200000) | 0) <= body.x &&
                body.x <= ((bounds.right + 0x200000) | 0)) {
              calls.push({ operation: "camera", request: [5, body.x, body.y] },
                { operation: "schedule" });
            } else remove();
            return { body, calls };
          }
        }
      }
    }
    calls.push({ operation: "particle", request: [
      0x80000, body.x, body.y, 0, 0, 0, 0, 0, 0x2a5, 0, 65536, 0x1999,
    ] });
    remove();
  } else if (event === 0x3eb) {
    calls.push({ operation: "render", request: [
      0x40000, body.x, body.y, 0,
      body.direction < 0 ? body.sprite | 0x40000 : body.sprite, body.progress,
    ] });
  }
  return { body, calls };
}
