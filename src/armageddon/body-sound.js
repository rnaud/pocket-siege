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
