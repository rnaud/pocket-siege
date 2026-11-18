import { nativeBodyVirtualEntry } from "./body-virtuals.js";

//004EDB90: accelerated/reconstruction suppression precedes device lookup.
// The -1 sentinel is distinct from a missing device (0).
export function nativeBodyStartSound(suppressed, backend, request) {
  if (suppressed) return -1;
  return backend ? backend.start(...request) : 0;
}

//004EDC10/004EDC30 do not apply the start-sound suppression gate.
export function nativeBodySoundFinished(backend, handle) {
  return backend ? backend.finished(handle) : 0;
}
export function nativeBodyStopSound(backend, handle) {
  return backend ? backend.stop(handle) : 0;
}

//004F4260 ->004EDC30/004EDB90. Stop callbacks may replace the scene or
//device, so resolve the start gate and backend only after stopping the old
//handle. The newly returned handle wins over callback writes to actor+F4.
export function nativeBodyImpactSoundMemory(memory, body, request, host) {
  const entry = nativeBodyVirtualEntry(memory, body, 0x48);
  if (entry !== 0x4f4260)
    throw new RangeError(
      `Native impact sound handler not connected: ${entry.toString(16)}`,
    );
  const previous = memory.get(body + 0xf4);
  if (previous) {
    const backend = memory.get(memory.get(body + 0x38) + 0xc);
    if (backend) host.stopSound(backend, previous | 0);
  }
  const scene = memory.get(body + 0x38);
  let handle = -1;
  if (!memory.get(scene + 0x1d448)) {
    const backend = memory.get(scene + 0xc);
    handle = backend
      ? host.startSound(backend, request[0], 0, ...request.slice(1))
      : 0;
  }
  memory.put(body + 0xf4, handle);
}
