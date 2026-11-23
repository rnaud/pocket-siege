import { nativeSin, nativeCos } from "./trig.js";

// Kamikaze (weapon kind 4, subtype 4): the 004FCB20 launch puts the worm in
// state 0x6D. Positions and velocities are native 16.16, y down; `aim` is the
// worm's +0x260 word (0 down, 0x8000 level, 0x10000 up) and `facing` is ±1.

// 004FAF90, kind 4: the aim mirrored for a left-facing worm, halved, gives
// (sin, cos) as the unit direction.
function aimDirection(aim, facing) {
  const mirrored = facing < 0 ? (0x20000 - aim) | 0 : aim | 0;
  const half = Math.trunc(mirrored / 2);
  return [nativeSin(half), nativeCos(half)];
}

// 004F76A0, entering state 0x6D: a dig budget from weapon +0x70, the
// wkami1..5 frame (sprites 0x89..0x8D) chosen by aim, the position aligned
// to a whole pixel and kept off the map edge when the border flag
// (scene+0x11D67) or roof (scene+0x1B8AC) is set, the unit aim velocity,
// physics off (+0x114) and scene+0x12418 set.
export function nativeKamikazeStart(record, { aim, facing, x, y }, { border = 0, roof = 0 } = {}) {
  const [vx, vy] = aimDirection(aim, facing);
  x &= 0xffff0000; y &= 0xffff0000;
  if (border) {
    x = Math.min(Math.max(x, 0x180000), 0x7680000);
    y = Math.min(Math.max(y, 0x180000), 0x2a00000);
  } else if (roof && y < 0x180000) y = 0x180000;
  return {
    body: { dig: record["0x70"] | 0, x: x | 0, y: y | 0 },
    calls: [
      { operation: "clear" },
      { operation: "queue", sprite: 0x8d - ((Math.imul(aim, 4) + 0x8000) >> 16) },
      { operation: "position", x: x | 0, y: y | 0 },
      { operation: "velocity", x: vx, y: vy },
      { operation: "physics", value: 0 },
    ],
    flag: 1,
  };
}

const snap = (v) => (v < -0x8000 ? -0x10000 : v > 0x8000 ? 0x10000 : 0);
const abs = (v) => (v < 0 ? -v : v);

// 004F77E0, one state 0x6D frame. The direction snaps to eight ways (3/5 on
// diagonals). While the dig budget lasts (20 per frame) it cuts tool mask 4
// (5 on diagonals) where the worm is, then tests that mask against the
// landscape, moves 16 pixels and rams with 004F7DA0. Leaving the map or a
// solid test explodes; reaching water+8 hands over to drowning (0x87).
// `io.dig(size, x, y)` cuts the landscape at once (landscape +0xC) so the
// following `io.test(size, x, y)` tool test (+0x10) sees it; `io.random()`
// the visual random stream; `worm.total` the damage taken this turn
// (004C2E50), which also sets it off; `worm.health` its health (004C2CC0).
// Returns 1 while flying.
export function nativeKamikazeTick(record, input, worm, scene, io) {
  const body = { ...input }, calls = [];
  let [dx, dy] = aimDirection(worm.aim, worm.facing);
  let x = body.x & 0xffff0000, y = body.y & 0xffff0000;
  dx = snap(dx); dy = snap(dy);
  if (dx && dy) { dx = Math.trunc((dx * 3) / 5); dy = Math.trunc((dy * 3) / 5); }
  calls.push({ operation: "camera" });
  const size = abs(dx) < 0x1999 || abs(dy) < 0x1999 ? 4 : 5;
  if (body.dig) {
    body.dig = Math.max(0, (body.dig - 20) | 0);
    if (body.dig) {
      calls.push({ operation: "dig", request: [size, x >> 16, y >> 16] });
      io.dig?.(size, x >> 16, y >> 16);
    }
  }
  const request = [size, x >> 16, y >> 16];
  calls.push({ operation: "test", request });
  let hit = io.test(...request) ? 1 : 0;
  x = (x + dx * 16) | 0; y = (y + dy * 16) | 0;
  body.x = x; body.y = y;
  calls.push({ operation: "position", x, y });
  const angle = Math.trunc((record["0x84"] << 16) / 360);
  const push = record["0x80"] | 0;
  calls.push({ operation: "area", request: [
    x, y, 0x180000, 0x180000, record["0x7c"] | 0,
    Math.imul(Math.trunc(Math.imul(nativeSin(angle), push) / 10), worm.facing),
    Math.trunc(Math.imul(nativeCos(angle), push) / -10) | 0,
    4, 0x65, 0x2a5, 0x20c4c, 1,
  ] });
  if (x < -0x2000000 || x > 0x9800000 || y < -0x2000000) hit = 1;
  const vy = ((io.random() >>> 0) & 0xffff) - 0x8000;
  const vx = ((io.random() >>> 0) & 0xffff) - 0x8000;
  const py = (y + ((io.random() >>> 0) & 0xffff) * 4) | 0;
  const px = (x + ((io.random() >>> 0) & 0xffff) * 4) | 0;
  calls.push({ operation: "particle", request: [0x80000, px, py, 0, vx, vy, 0, 0, 0x2a6, 0, 0x10000, 0x51e] });
  if (scene.water + 8 <= y >> 16) {
    calls.push({ operation: "velocity", x: dx << 4, y: dy << 4 }, { operation: "state", state: 0x87 });
    return { body, calls, result: 0 };
  }
  if (!hit && !worm.total) return { body, calls, result: 1 };
  calls.push({ operation: "blast", packet: [1, x, y, 100, record["0x74"] | 0, 0] });
  if (worm.health) calls.push({ operation: "accounting", request: [worm.health, 1, 1] });
  if (!worm.marked) calls.push({ operation: "announcement" });
  calls.push({ operation: "state", state: 0x89 }, { operation: "delete", value: 1 });
  return { body, calls, result: 0 };
}

// Landscape vtable +0x10 (004A8AF0): whether any pixel of a terrain tool
// mask, placed by its anchor, lands on solid ground.
export function nativeToolMaskHits(mask, x, y, solid) {
  const left = x - mask.anchorX, top = y - mask.anchorY;
  for (const [px, py] of mask.hole) if (solid(left + px, top + py)) return true;
  return false;
}
