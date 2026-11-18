import { nativeRopeMotionInPlace } from "./rope-motion.js";
import { fixedMultiply } from "./numeric.js";
import { nativeSweep } from "./motion.js";
const abs32 = (value) => ((value ^ (value >> 31)) - (value >> 31)) | 0;

//004C9F10. Collisions and skim events may mutate the body or water level;
//read their resulting memory before applying each subsequent native write.
export function nativeWaterMotionMemory(
  memory,
  environment,
  body,
  submerged,
  host,
) {
  const get = (offset) => memory.get(body + offset) | 0;
  const put = (offset, value) => memory.put(body + offset, value);
  const waterY = () => memory.get(environment + 0x3b4) | 0;
  if (!(get(0x40) & 0x400000) || get(0x94) >> 16 <= waterY()) return 0;
  if (
    !submerged &&
    Math.imul(abs32(get(0xa0)), 3) <
      abs32(fixedMultiply(get(0x9c), get(0xb4))) &&
    abs32(get(0xa0)) < 0x80000 &&
    abs32(get(0x9c)) > 0x60000
  ) {
    if (!host.collide(environment, body, get(0x90), waterY() << 16)) {
      put(0x94, waterY() << 16);
      put(0x9c, fixedMultiply(get(0x9c), 0xcccc));
      put(0xa0, -get(0xa0));
      host.skim(body);
      return 0;
    }
  }
  put(0x9c, fixedMultiply(get(0x9c), get(0x60)));
  const vy = fixedMultiply(get(0xa0), get(0x60));
  put(0xa0, vy);
  put(0xbc, 1);
  put(0xa0, (vy + 0x4ccc) | 0);
  return 1;
}

//004CA110. In particular, gravity is visible to the horizontal collision
//callback before wind and drag are applied, not copied back after it returns.
export function nativeAirForcesMemory(memory, environment, body, host) {
  const get = (offset) => memory.get(body + offset) | 0;
  const put = (offset, value) => memory.put(body + offset, value);
  const gravity = fixedMultiply(memory.get(environment + 0x3b8) | 0, get(0x6c));
  if (!gravity) return 0;
  if (
    !get(0x9c) &&
    !get(0xa0) &&
    host.collide(
      environment,
      body,
      get(0x90),
      (get(0x94) + (gravity < 1 ? -65536 : 65536)) | 0,
    )
  )
    return 0;
  put(0xa0, (get(0xa0) + gravity) | 0);
  const wind = fixedMultiply(memory.get(environment + 0x3bc) | 0, get(0x68));
  if (
    !host.collide(
      environment,
      body,
      (get(0x90) + (wind < 1 ? -65536 : 65536)) | 0,
      get(0x94),
    )
  )
    put(0x9c, (get(0x9c) + wind) | 0);
  put(0x9c, fixedMultiply(get(0x9c), get(0x64)));
  put(0xa0, fixedMultiply(get(0xa0), get(0x64)));
  put(0xc4, 1);
  return 1;
}

//004C9AA0 keeps trial positions in locals until collision/finish. Callbacks
//see the unchanged stored position; their other body writes must survive.
export function nativeSweepMemory(memory, environment, body, remaining, host) {
  const result = nativeSweep(
    {
      x: memory.get(body + 0x90) | 0,
      y: memory.get(body + 0x94) | 0,
      vx: memory.get(body + 0x9c) | 0,
      vy: memory.get(body + 0xa0) | 0,
    },
    remaining,
    (x, y) => host.collide(environment, body, x, y),
  );
  memory.put(body + 0x90, result.x);
  memory.put(body + 0x94, result.y);
  return result;
}

//004CA8A0 uses body/segment memory throughout its callbacks. This view lets the
//same recovered solver write through immediately and retain callback mutations.
export function nativeRopeMotionMemory(
  memory,
  environment,
  address,
  remaining,
  host,
) {
  const body = {};
  const fields = {
    x: 0x90,
    y: 0x94,
    vx: 0x9c,
    vy: 0xa0,
    anchorX: 0xcc,
    anchorY: 0xd0,
    length: 0xd4,
    segmentCount: 0xdc,
  };
  for (const [name, offset] of Object.entries(fields))
    Object.defineProperty(body, name, {
      get: () => memory.get(address + offset) | 0,
      set: (value) => memory.put(address + offset, value),
    });
  body.segments = new Proxy(
    {},
    {
      get: (_, index) =>
        memory.get(memory.get(address + 0xf8) + Number(index) * 4) | 0,
      set: (_, index, value) => {
        memory.put(memory.get(address + 0xf8) + Number(index) * 4, value);
        return true;
      },
    },
  );
  const terrain = memory.get(memory.get(environment + 0x3c0) + 0x24);
  const result = nativeRopeMotionInPlace(body, remaining, {
    terrain: (x, y) => host.terrain(terrain, x, y),
    collide: (x, y) => host.collide(environment, address, x, y),
  });
  return { remaining: result.remaining, hit: result.hit };
}
