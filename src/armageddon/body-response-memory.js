import { nativeBodyImpactSoundMemory } from "./body-sound.js";
import { nativeBodyCollision } from "./body-collision.js";
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

//004F4C60: rope impact reflects both velocity components using coefficient+88.
export function nativeRopeBounceMemory(memory, body) {
  const entry = nativeBodyVirtualEntry(memory, body, 0x30);
  if (entry !== 0x4f4c60)
    throw new RangeError(
      `Native rope response not connected: ${entry.toString(16)}`,
    );
  memory.put(
    body + 0x9c,
    -fixedMultiply(memory.get(body + 0x9c) | 0, memory.get(body + 0x88) | 0),
  );
  memory.put(
    body + 0xa0,
    -fixedMultiply(memory.get(body + 0xa0) | 0, memory.get(body + 0x88) | 0),
  );
}

//Actor-specific impact audio precedes004F4C30. The contacted actor's +28
//handler gets first refusal. Only a zero
//return invokes the moving actor's +24 response; keep both identities intact.
export function nativeBodyContactMemory(memory, body, other, side, host) {
  const entry = nativeBodyVirtualEntry(memory, body, 0x2c);
  const impact = { 0x4e8ba0: 0x6b, 0x4d5570: 0x6d, 0x4d15f0: 0x72 }[entry];
  if (impact !== undefined) {
    const velocityEntry = nativeBodyVirtualEntry(memory, body, 0x60);
    if (velocityEntry !== 0x4d0f70)
      throw new RangeError(
        `Native impact velocity handler not connected: ${velocityEntry.toString(16)}`,
      );
    const abs = (value) => ((value ^ (value >> 31)) - (value >> 31)) | 0;
    const speed =
      (abs(memory.get(body + 0x9c) | 0) + abs(memory.get(body + 0xa0) | 0)) | 0;
    if (entry === 0x4e8ba0 || !memory.get(memory.get(body + 0x38) + 0x1ac4))
      nativeBodyImpactSoundMemory(
        memory,
        body,
        [impact, 65536, Math.trunc(speed / 5) | 0, 0],
        host,
      );
  } else if (entry !== 0x4f4c30)
    throw new RangeError(
      `Native contact handler not connected: ${entry.toString(16)}`,
    );
  const accepted = host.acceptContact
    ? host.acceptContact(other, body, side)
    : nativeAcceptBodyContactMemory(memory, other, body, side);
  if (!accepted) {
    if (host.respondContact) host.respondContact(body, other, side);
    else nativeRespondBodyContactMemory(memory, body, other, side, host);
  }
}

//004F4990 /004E8B80 transfer momentum.004D15E0 declines handling.
export function nativeAcceptBodyContactMemory(
  memory,
  receiver,
  incoming,
  side,
) {
  const entry = nativeBodyVirtualEntry(memory, receiver, 0x28);
  if (entry === 0x4d15e0) return 0;
  if (entry !== 0x4f4990 && entry !== 0x4e8b80)
    throw new RangeError(
      `Native contact receiver not connected: ${entry.toString(16)}`,
    );
  const read = (body) => ({
    vx: memory.get(body + 0x9c) | 0,
    vy: memory.get(body + 0xa0) | 0,
    mass: memory.get(body + 0x58) | 0,
    tangent: memory.get(body + 0x80) | 0,
  });
  const result = nativeBodyCollision(read(receiver), read(incoming), side);
  for (const [body, velocity] of [
    [receiver, result.receiver],
    [incoming, result.incoming],
  ]) {
    memory.put(body + 0x9c, velocity.vx);
    memory.put(body + 0xa0, velocity.vy);
  }
  return result.result;
}

//004D1260 uses the actor's current scene environment, and clears sleep only
//after an accepted position. The caller may cache the +100 virtual entry.
export function nativeTryBodyPositionMemory(
  memory,
  body,
  x,
  y,
  host,
  entry = nativeBodyVirtualEntry(memory, body, 0x100),
) {
  if (entry !== 0x4d1260)
    throw new RangeError(
      `Native position handler not connected: ${entry.toString(16)}`,
    );
  const environment = memory.get(memory.get(body + 0x38) + 0x7d4);
  if (host.collide(environment, body, x, y)) return 0;
  memory.put(body + 0x90, x);
  memory.put(body + 0xb8, 0);
  memory.put(body + 0x94, y);
  return 1;
}

//004F4860 with004F4700 complex stepping. Failed probes can mutate the actor;
//the second attempt rereads its coordinates, but uses the cached direction
//and virtual entry. Final low-speed stops apply to both contacting bodies.
export function nativeRespondBodyContactMemory(
  memory,
  body,
  other,
  side,
  host,
) {
  const entry = nativeBodyVirtualEntry(memory, body, 0x24);
  if (entry !== 0x4f4860)
    throw new RangeError(
      `Native bounce handler not connected: ${entry.toString(16)}`,
    );
  const get = (offset) => memory.get(body + offset) | 0,
    put = (offset, value) => memory.put(body + offset, value);
  if (side === 1 || side === 3) {
    put(0x9c, fixedMultiply(get(0x9c), get(0x80)));
    put(0xa0, -fixedMultiply(get(0xa0), get(0x7c)));
  } else if (side === 2 || side === 4) {
    let stepped = false;
    if (get(0x4c)) {
      const step = get(0x9c) < 0 ? -65536 : 65536;
      const positionEntry = nativeBodyVirtualEntry(memory, body, 0x100);
      const attempt = (x, y) =>
        host.tryPosition
          ? host.tryPosition(body, x, y)
          : nativeTryBodyPositionMemory(
              memory,
              body,
              x,
              y,
              host,
              positionEntry,
            );
      stepped =
        attempt((get(0x90) + step) | 0, (get(0x94) - 65536) | 0) ||
        attempt((get(0x90) + step) | 0, (get(0x94) + 65536) | 0);
    }
    if (stepped)
      put(
        0x9c,
        fixedMultiply(get(0x9c), Math.trunc(Math.imul(get(0x80), 30) / 32)),
      );
    else {
      put(0x9c, -fixedMultiply(get(0x9c), get(0x78)));
      put(0xa0, fixedMultiply(get(0xa0), get(0x80)));
    }
  }
  const abs = (v) => ((v ^ (v >> 31)) - (v >> 31)) | 0;
  for (const actor of [body, other])
    if (
      ((abs(memory.get(actor + 0x9c) | 0) + abs(memory.get(actor + 0xa0) | 0)) |
        0) <
      0x6666
    ) {
      memory.put(actor + 0xa0, 0);
      memory.put(actor + 0x9c, 0);
    }
}
