import { nativeSin, nativeCos } from "./trig.js";

// 004F74F0, state6E. Sound allocation and the registry overlap query remain
// caller interfaces. Native coordinates are signed16.16, downward-positive Y.
export function nativeDrillTick(input, record, random, interfaces = {}) {
  const body = { ...input }, calls = [];
  if (!body.loopHandle) {
    const request = [0x10054, 65536, 0, 0];
    calls.push({ operation: "loopSound", request });
    body.loopHandle = interfaces.startLoop?.(request) ?? 0;
  }
  calls.push({ operation: "camera" });
  body.remaining = (body.remaining - 20) | 0;
  let x = body.x, y = body.y;
  if ((random() & 0xf0000) < 0x50000) {
    x = (x + (random() & 65535) * 3 - 0x18000 - Math.imul(body.facing, 0x20000)) | 0;
    y = (y + (random() & 65535)) | 0;
    calls.push({ operation: "terrain", request: [2, x >> 16, y >> 16] });
    const angle = Math.trunc((record["0x78"] << 16) / 360);
    const vy = Math.trunc(Math.imul(nativeCos(angle), record["0x74"]) / -10) | 0;
    const sign = random() & 0x100 ? -1 : 1;
    const vx = Math.imul(sign, Math.trunc(Math.imul(nativeSin(angle), record["0x74"]) / 10));
    calls.push({ operation: "area", request: [
      x, y, 0x100000, 0x100000, record["0x70"], vx, vy, 2, 0x55, 0, 0x21c4c, 1,
    ] });
  }
  if (body.loopHandle) {
    const request = [x, (y + 0x80000) | 0];
    calls.push({ operation: "overlap", request });
    calls.push({ operation: "volume", request: [body.loopHandle, interfaces.overlap?.(...request) ? 65536 : 0] });
  }
  if (body.remaining < 1) calls.push({ operation: "state", value: 0x65 });
  return { body, calls };
}
