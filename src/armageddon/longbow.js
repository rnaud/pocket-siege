import { nativeDirectionTurn } from "./direction.js";

// The original Longbow arrow, the 0x148-byte task 004FCB20 builds for weapon
// kind 1 launch mode 4 (vtable 00527800). It flies with gravity and wind
// scales zero through empty movement shapes 6/7, so every contact comes from
// its own checks: each frame one of 32 rotated arrow shapes (ids 10..41) is
// tested against objects, then landscape. An object takes a kind 9 0x433
// packet with a quarter of the arrow's velocity and the record damage; the
// landscape keeps the arrow, which is blitted into it as terrain.
//
// Interfaces (signed 16.16 native coordinates, y down):
//   probe(shape, x, y, flags) / query(shape, flags, body) -> target | 0
//     collision world +8 (standalone) and +0x3C (at the arrow, with its
//     overlap cache); reshape(shape, body) -> 0 | 1 (+0x40, shape change).
//   place(x, y, flags) -> target | 0, owner(category, id) -> target,
//   category(target), hit(target, event, size, packet), dirt(x, y, angle,
//   spread, distance) (004EDD10), sound(request), random() (004EE930),
//   bubble(request) (004EDFA0), camera(request) (004EE990), busy()
//   (004EEBE0), size(index) -> [w, h], stamp(request) (landscape +0x14),
//   draw(request) (004EEDF0), waterSprite(id) (004AAFD0), event(id)
//   (004F4410), notify(...) and remove(value) (vtable +0, deletion).
export const NATIVE_ARROW_SPRITE = 0x282;
export const NATIVE_ARROW_HIT_SOUND = [0x1c, 5, 0x10000, 0x10000, 0];
const abs32 = (value) => {
  const sign = value >> 31;
  return ((value ^ sign) - sign) | 0;
};
const quarter = (value) => Math.trunc(value / 4) | 0;

// 00503130/00503230: heading from the velocity (kept while at rest), then
// the rotated shape 10 + heading * 32 / 65536.
export function nativeArrowShape(angle) {
  return ((((angle & 0xffff) << 5) >> 16) + 10) | 0;
}
// 0049C030 returns its turn zero-extended (and eax, 0xffff).
const turn = (vx, vy) => nativeDirectionTurn(vx, -vy | 0) & 0xffff;
function heading(body) {
  if (body.vx || body.vy) body.angle = turn(body.vx, body.vy);
  body.angle &= 0xffff;
  return nativeArrowShape(body.angle);
}
const ownerId = (body) => ((body.packet[0] << 4) + body.packet[1]) | 0;
function reshape(body, shape, io) {
  const ok = io.reshape(shape, body);
  if (ok) body.shape = shape;
  return ok;
}

// 005035D0: a hit throws dirt and sounds; landscape marks the arrow stuck,
// anything else takes {9, x, y, v/4, damage}, pushed back at its shooter.
export function nativeArrowHit(body, target, io) {
  const { x, y, vx, vy } = body;
  let shooter = 0;
  if (body.packet[0] && body.packet[1]) shooter = io.owner(2, ownerId(body));
  io.dirt(x, y, turn(vx, vy), 0xccc, 1);
  io.sound([...NATIVE_ARROW_HIT_SOUND]);
  if (io.category(target) === 1) {
    if (!body.stuck) body.stuck = 1;
    return body;
  }
  const sign = shooter === target ? -1 : 1;
  io.hit(target, 0x433, 0x124, [9, x, y, Math.imul(sign, quarter(vx)), Math.imul(sign, quarter(vy)), body.damage]);
  return body;
}

// 005034A0: a landscape-stuck arrow takes movement shape 6, hits an object
// still under it, or else blits its rotated image centred on it.
export function nativeArrowStick(body, io) {
  if (!body.stuck) return body;
  reshape(body, 6, io);
  const shape = heading(body);
  const target = io.probe(shape, body.x, body.y, -3);
  if (target) {
    nativeArrowHit(body, target, io);
    body.stuck = 0;
    return body;
  }
  const index = (body.angle << 5) >> 16;
  const [width, height] = io.size(index);
  io.stamp([((body.x >> 16) - Math.trunc(width / 2)) | 0,
    ((body.y >> 16) - Math.trunc(height / 2)) | 0, width, height, index, 0, 0]);
  body.stuck = 0;
  return body;
}

// 00503130 (first = true, on construction) / 00503230 (each frame). Returns 0
// once the arrow has hit something, otherwise whether shape 7 was taken.
export function nativeArrowCheck(body, io, first = false) {
  const shape = heading(body);
  if (first) {
    if (io.probe(shape, body.x, body.y, 2)) {
      nativeArrowHit(body, io.owner(2, ownerId(body)), io);
      return 0;
    }
    const target = io.query(shape, -3, body);
    if (target) {
      nativeArrowHit(body, target, io);
      return 0;
    }
  } else {
    const target = io.query(shape, -3, body) || io.query(shape, 2, body);
    if (target) {
      nativeArrowHit(body, target, io);
      nativeArrowStick(body, io);
      return 0;
    }
  }
  return reshape(body, 7, io) ? 1 : 0;
}

// 00502E70 after the base body (004F4000 category 0x10, shape 6) and task
// setup. `base` holds the base body's fields; `slot` is the draw-order slot.
export function nativeArrowCreate(base, packet, damage, slot, io) {
  const body = { ...base, shape: 6 };
  io.base(0x10, 6);
  io.task(12);
  if (packet[0]) io.notify(0x14, 0, 0x434, 0x124, packet[0]);
  Object.assign(body, {
    slot, packet: packet.slice(0, 11).map((v) => v | 0), damage,
    stuck: 0, angle: 0, splashed: 0, sunk: 0, bubbles: 0, offMap: 0,
    flags: 0, mass: 0x10000, vx: packet[4] | 0, vy: packet[5] | 0,
    field78: 0, field7c: 0, windScale: 0, gravityScale: 0, field4c: 0, enabled: 1,
  });
  if (!io.place(packet[2] | 0, packet[3] | 0, body.flags)) {
    body.x = packet[2] | 0;
    body.y = packet[3] | 0;
    body.sleeping = 0;
  }
  body.flags = -1;
  const alive = nativeArrowCheck(body, io, true);
  if (!alive) io.remove(1);
  return { body, removed: !alive };
}

// 00503840 event 0x3EA, after the separately scheduled physics tick.
// scene: { water, bottom (+0x804/+0x808 px), left, right, top (16.16) }.
export function nativeArrowFrame(input, scene, io) {
  const body = { ...input };
  const remove = () => {
    io.busy();
    io.remove(1);
    return { body, removed: true };
  };
  io.event(0x3ea);
  const { x, y, vy } = body;
  if (!body.offMap && (x < -0x400000 || x > 0x7c00000)) {
    body.gravityScale = 0x20000;
    body.offMap = 1;
  }
  if (Math.trunc(abs32(((x >> 16) - 0x3c0) | 0) / 25) >= 500) body.state = 1;
  if (scene.bottom <= (y >> 16)) return remove();
  if (body.submerged || body.surface || scene.water <= (y >> 16)) {
    body.bubbles = (body.bubbles + 0x4000) | 0;
    while (body.bubbles >= 0x10000) {
      const size = (((io.random() >>> 16) % 3) + 1) | 0;
      io.bubble([x, y, 0, 0, size]);
      body.bubbles = (body.bubbles - 0x10000) | 0;
    }
  }
  if (body.surface) {
    if (!body.splashed && abs32(vy) > 0x10000) io.sound([0x39, 5, 0x10000, 0x10000, 0]);
    body.splashed = 1;
  } else body.splashed = 0;
  if (body.submerged && !body.sunk) {
    body.flags = 0x400000;
    body.sunk = 1;
  }
  io.busy();
  const inside = scene.left <= x && x <= scene.right && scene.top <= y;
  io.camera([body.submerged ? 10 : inside ? 5 : 8, x, y]);
  if (!body.sunk && !nativeArrowCheck(body, io)) return remove();
  if (body.state) {
    nativeArrowStick(body, io);
    return remove();
  }
  return { body, removed: false };
}

// 00503840 event 0x3EB: sprite 0x282 (its water bank variant while in water)
// at the heading, ordered by the arrow's draw slot.
export function nativeArrowDraw(body, layer, io) {
  const sprite = body.submerged || body.surface ? io.waterSprite(NATIVE_ARROW_SPRITE) : NATIVE_ARROW_SPRITE;
  io.draw([(layer * 2 + 0x50001) | 0, body.x, body.y, 0, sprite, body.angle]);
  io.event(0x3eb);
}

// 00503720, body vtable +0x3C: the water entry/exit sound, a twentieth of
// the base volume.
export function nativeArrowWaterSound(body) {
  const speed = (abs32(body.vx) + abs32(body.vy)) | 0;
  return [0x39, 0, 0x10000, Math.trunc(((Math.trunc(speed / 5) + 0x8000) | 0) / 20) | 0, 0];
}

// 00503780, body vtable +0x2C: a movement contact hits and stops the arrow.
export function nativeArrowContact(body, target, io) {
  nativeArrowHit(body, target, io);
  body.state = 1;
  body.suspended = 1;
  return body;
}
