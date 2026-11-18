import { fixedMultiply } from "./numeric.js";

//004D11E0. Resolve the actual virtual entry rather than treating every actor
//as the same class; unknown overrides need their own recovered dispatch.
export function nativeBodyAwakeMemory(memory, body) {
  const entry = memory.get(memory.get(body) + 0xf4);
  if (entry !== 0x4d11e0)
    throw new RangeError(
      `Native awake handler not connected: ${entry.toString(16)}`,
    );
  return Number(
    [0x9c, 0xa0, 0xbc, 0xc0, 0xc4].some(
      (offset) => memory.get(body + offset) !== 0,
    ),
  );
}

//004CA250: two updates of the scene's earthquake random stream, including
//frame addition and 32-bit overflow, before delivering virtual +34 impulse.
export function nativeEarthquakeMemory(
  memory,
  environment,
  body,
  strength,
  impulse,
) {
  if (memory.get(body + 0xbc)) return;
  const sample = () => {
    const scene = memory.get(environment + 0x3c0);
    const seed =
      (Math.imul(
        (memory.get(scene + 0x7f0) + memory.get(scene + 0x1acc)) | 0,
        0x19660d,
      ) +
        0x3c6ef35f) |
      0;
    memory.put(scene + 0x1acc, seed);
    return fixedMultiply(((seed & 0xffff00) >>> 8) - 0x8000, strength);
  };
  const x = sample(),
    y = sample();
  if (x || y) {
    if (impulse) impulse(body, x, y);
    else nativeBodyVelocityResponseMemory(memory, body, x, y);
  }
}

// Virtual +34 differs by actor:004D12B0 replaces velocity;004F4D20 adds it.
// Do not substitute a mass-scaled impulse or silently accept an unknown class.
export function nativeBodyVelocityResponseMemory(memory, body, x, y) {
  const entry = memory.get(memory.get(body) + 0x34);
  if (entry === 0x4d12b0) {
    memory.put(body + 0x9c, x);
    memory.put(body + 0xa0, y);
  } else if (entry === 0x4f4d20) {
    memory.put(body + 0x9c, (memory.get(body + 0x9c) + x) | 0);
    memory.put(body + 0xa0, (memory.get(body + 0xa0) + y) | 0);
  } else
    throw new RangeError(
      `Native velocity response not connected: ${entry.toString(16)}`,
    );
  return 1;
}
