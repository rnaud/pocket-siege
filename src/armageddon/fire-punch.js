import { nativeSin, nativeCos } from "./trig.js";

// 004F7190: animation entry, vertical launch, and terrain clearance ahead
// of the rising worm. Coordinates and velocity use native downward-positive Y.
export function nativeFirePunchEntry(power, x, y) {
  const vy = Math.trunc(Math.imul(power, -0x60000) / 100) | 0;
  const calls = [
    { operation: "clear" },
    { operation: "queue", sprite: 0x1b0 },
    { operation: "velocity", x: 0, y: vy },
  ];
  if (vy < 0) calls.push({
    operation: "terrain", request: [3, x >> 16, (((y + vy) | 0) >> 16) - 2],
  });
  return calls;
}

// 004F7396..004F7424: called during the upward part of state 0x6c.
// Unlike Prod, angle is record74 and impulse magnitude is record78.
export function nativeFirePunchRequest(record, x, y, facing) {
  const angle = Math.trunc((record["0x74"] << 16) / 360);
  const push = record["0x78"];
  return [
    (x + Math.imul(facing, 0x80000)) | 0, y,
    0x100000, 0x1e0000, record["0x70"],
    Math.imul(Math.trunc(Math.imul(nativeSin(angle), push) / 10), facing),
    Math.trunc(Math.imul(nativeCos(angle), push) / -10) | 0,
    8, 0x65, 0x2a5, 0x20c4c, 1,
  ];
}
