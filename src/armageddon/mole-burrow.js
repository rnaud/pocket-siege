import { fixedMultiply, fixedDivide } from "./numeric.js";
import { nativeSin, nativeCos } from "./trig.js";
import { nativeDirectionTurn } from "./direction.js";

// 004EDD10: six samples across `spread` around `angle`, `distance` from the
// point; each sample over coloured landscape sends 0x43F {x, y, vx, vy,
// colour} to the dirt receiver with two logic-random draws. Returns the calls.
export function nativeDirtSpray(x, y, angle, spread, distance, { color, random }) {
  const calls = [];
  let accumulated = 0;
  const half = Math.trunc(spread / 2);
  for (let i = 0; i < 6; i++) {
    const a = (angle + Math.trunc(accumulated / 5) - half) | 0;
    const px = (x + Math.imul(nativeSin(a), distance)) >> 16;
    const py = (y + Math.imul(-nativeCos(a), distance)) >> 16;
    const shade = color(px, py) | 0;
    if (shade) {
      const r1 = random() >>> 0, r2 = random() >>> 0;
      const vx = ((r1 & 0xffff) * 2 - 0x10000 - nativeSin(angle) * 5) | 0;
      const vy = ((r2 & 0xffff) * 2 - 0x10000 + nativeCos(angle) * 5) | 0;
      calls.push({ operation: "dirt", event: 0x43f, packet: [x | 0, y | 0, vx, vy, shade] });
    }
    accumulated = (accumulated + spread) | 0;
  }
  return calls;
}

// 004E3570, a mode-4 projectile frame (Mole Bomb's mole). After touching
// ground the contact handler saves its arc and sets the dig counter to 10;
// each frame it advances a tenth of a frame along that arc, sprays dirt every
// third frame, keeps the counter at 10 while tool mask 1 meets ground here or
// 6 px lower (otherwise counts down), digs, and moves. When the counter runs
// out or it reaches the water line it resumes physics armed, with the arc's
// velocity over one frame, vertical part clamped to -100..2 px.
export function nativeMoleBurrow(input, { gravity, frame, water }, io) {
  const body = { ...input }, calls = [];
  if (!body.counter) return { body, calls };
  const at = (t) => [
    (body.x + fixedMultiply(t, body.vx)) | 0,
    (body.y + fixedMultiply(t, body.vy) + Math.trunc(fixedMultiply(fixedMultiply(t, t), gravity) / 2)) | 0,
  ];
  body.time = (body.time + 0x1999) | 0;
  const [x, y] = at(body.time);
  const [x2, y2] = at((body.time + 0x1999) | 0);
  const dx = (x2 - x) | 0, dy = (y2 - y) | 0;
  const angle = nativeDirectionTurn(dx, -dy | 0);
  if ((frame | 0) % 3 === 0) calls.push(...nativeDirtSpray(x, y, angle, 0x2666, 0x14, io));
  const px = x >> 16, py = y >> 16;
  calls.push({ operation: "test", request: [1, px, py] });
  let solid = io.test(1, px, py);
  if (!solid) {
    calls.push({ operation: "test", request: [1, px, (py + 6) | 0] });
    solid = io.test(1, px, (py + 6) | 0);
  }
  body.counter = solid ? 10 : (body.counter - 1) | 0;
  calls.push({ operation: "dig", request: [1, px, py] });
  io.dig?.(1, px, py);
  calls.push({ operation: "velocity", x: dx, y: dy }, { operation: "position", x, y });
  if (!io.place(x, y)) calls.push({ operation: "state", state: 1 });
  if (water > py && body.counter) return { body, calls };
  calls.push({ operation: "physics", value: 0 });
  body.counter = 0;
  body.armed = 1;
  const [x1, y1] = at((body.time + 0x10000) | 0);
  const fall = (y1 - y) | 0;
  const vy = Math.min(Math.max(fall, -0x640000), 0x20000);
  calls.push({ operation: "velocity", x: fixedMultiply((x1 - x) | 0, fixedDivide(vy, fall)), y: vy });
  return { body, calls };
}
