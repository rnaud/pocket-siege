import { nativeBodyVirtualEntry } from "./body-virtuals.js";
import { fixedMultiply } from "./numeric.js";

//004D11E0. Resolve the actual virtual entry rather than treating every actor
//as the same class; unknown overrides need their own recovered dispatch.
export function nativeBodyAwakeMemory(memory, body) {
  const entry = nativeBodyVirtualEntry(memory, body, 0xf4);
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
  const entry = nativeBodyVirtualEntry(memory, body, 0x34);
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

//004EDC90: enqueue into the actor's scene-owned sixteen-entry sound buffer.
export function nativeQueueBodySoundMemory(memory, body, request) {
  const scene = memory.get(body + 0x38),
    count = memory.get(scene + 0x1cad4) | 0;
  if (count > 15) return 0;
  for (let i = 0; i < 5; i++)
    memory.put(scene + 0x1c994 + count * 20 + i * 4, request[i]);
  memory.put(scene + 0x1cad4, (count + 1) | 0);
  return 1;
}

//004F4FE0 /004F4FC0, called via +3C/+40. Original overflow and truncation
//matter for splash volume. Muting is handled when the scene flushes the queue.
export function nativeBodyWaterResponseMemory(memory, body, offset) {
  const entry = nativeBodyVirtualEntry(memory, body, offset);
  if (offset === 0x40 && entry === 0x4f4fc0)
    return nativeQueueBodySoundMemory(memory, body, [0x3a, 0, 65536, 65536, 0]);
  if (offset === 0x3c && entry === 0x4f4fe0) {
    const abs = (value) => ((value ^ (value >> 31)) - (value >> 31)) | 0;
    const sum =
      (abs(memory.get(body + 0x9c) | 0) + abs(memory.get(body + 0xa0) | 0)) | 0;
    return nativeQueueBodySoundMemory(memory, body, [
      0x39,
      0,
      65536,
      (Math.trunc(sum / 5) + 0x8000) | 0,
      0,
    ]);
  }
  throw new RangeError(
    `Native water response not connected: ${entry.toString(16)}`,
  );
}
