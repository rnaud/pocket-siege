import {
  nativeWaterMotionMemory,
  nativeAirForcesMemory,
  nativeSweepMemory,
  nativeRopeMotionMemory,
} from "./body-forces-memory.js";
import { fixedMultiply } from "./numeric.js";
import { nativeSin, nativeCos } from "./trig.js";
import { nativeBodyRotation } from "./motion.js";

//004CA320. Write directly to scene-owned bodies so virtual calls observe the
//original intermediate state. Lower-level motion/collision services are explicit
//addressed interfaces; copying a host body back at the end is not equivalent.
export function nativeBodyTickMemory(memory, environment, body, index, host) {
  const get = (offset) => memory.get(body + offset) | 0;
  const put = (offset, value) => memory.put(body + offset, value);
  const quake = () => memory.get(memory.get(environment + 0x3c0) + 0x1ac4) | 0;
  if (!get(0x48) || get(0x54)) return;
  const frame = memory.get(memory.get(environment + 0x3c0) + 0x7f0) | 0;
  if (((frame + index) | 0) % 13 === 0 || host.awake(body)) put(0xb8, 0);
  if (get(0xb8)) {
    if (quake()) host.earthquake(environment, body, quake());
    return;
  }
  host.refresh(environment, body);
  const submerged = get(0xbc);
  put(0xbc, 0);
  put(0xc0, 0);
  put(0xc4, 0);
  const water = host.water
    ? host.water(environment, body, submerged)
    : nativeWaterMotionMemory(memory, environment, body, submerged, host);
  if (!water) {
    if (!get(0xc8)) {
      if (host.air) host.air(environment, body);
      else nativeAirForcesMemory(memory, environment, body, host);
    } else {
      const gravity = fixedMultiply(
        memory.get(environment + 0x3b8) | 0,
        get(0x6c),
      );
      if (gravity) {
        put(0xc4, 1);
        put(0xa0, (get(0xa0) + gravity) | 0);
      }
    }
  }
  if (get(0xbc) !== submerged) host.waterChanged(body);
  if (get(0xc8)) {
    put(0x9c, fixedMultiply(get(0x9c), get(0x84)));
    put(0xa0, fixedMultiply(get(0xa0), get(0x84)));
    let remaining = 65536;
    for (let i = 0; i < 10 && remaining; i++) {
      const result = host.rope
        ? host.rope(environment, body, remaining)
        : nativeRopeMotionMemory(memory, environment, body, remaining, host);
      remaining = result.remaining;
      if (result.hit) host.bounce(body, result.hit);
    }
    let direction = 0;
    const segments = memory.get(body + 0xf8);
    for (let i = 0, count = get(0xdc); i < count; i++)
      direction = (direction + memory.get(segments + i * 8 + 4)) | 0;
    put(0x98, (direction + 0x8000) & 65535);
    direction &= 65535;
    const tangent =
      (fixedMultiply(get(0x9c), nativeCos(direction)) +
        fixedMultiply(get(0xa0), nativeSin(direction))) |
      0;
    if (
      direction <= 0x8000
        ? direction < get(0x8c) && tangent < 0
        : 0x10000 - direction < get(0x8c) && tangent > 0
    ) {
      put(0x9c, Math.trunc(Math.imul(get(0x9c), 19) / 20));
      put(0xa0, Math.trunc(Math.imul(get(0xa0), 19) / 20));
    }
    put(0xa4, 0);
  } else {
    let remaining = 65536;
    for (let i = 0; i < 2 && remaining; i++) {
      const result = host.sweep
        ? host.sweep(environment, body, remaining)
        : nativeSweepMemory(memory, environment, body, remaining, host);
      remaining = result.remaining;
      if (result.hit) host.freeBounce(body, result.hit, result.side);
    }
    if (get(0x5c)) {
      const rotated = nativeBodyRotation({
        vx: get(0x9c),
        vy: get(0xa0),
        radius: get(0x5c),
        angle: get(0x98),
        angularVelocity: get(0xa4),
      });
      put(0xa4, rotated.angularVelocity);
      put(0x98, rotated.angle);
    }
  }
  put(0x9c, Math.max(-0x200000, Math.min(0x200000, get(0x9c))));
  put(0xa0, Math.max(-0x200000, Math.min(0x200000, get(0xa0))));
  if (
    !get(0x9c) &&
    !get(0xa0) &&
    host.collide(environment, body, get(0x90), (get(0x94) + 65536) | 0)
  )
    put(0xc4, 0);
  if (quake() && !get(0xc4)) host.earthquake(environment, body, quake());
  if (!host.awake(body)) put(0xb8, 1);
}
