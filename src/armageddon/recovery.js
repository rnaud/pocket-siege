// State 0x76 entry 004D7C15..004D7CDA and tick 004DE9B0..004DEA17.
export function nativeRecoveryEntry(
  previous,
  maxVy,
  flag,
  handle,
  random,
  newHandle = 0,
) {
  const calls = [{ operation: "clear" }];
  let soundHandle = handle;
  let sprite = flag
    ? 0x239
    : previous === 0x7f
      ? maxVy > 0x80000
        ? 0x236
        : 0x233
      : [0x82, 0x83].includes(previous)
        ? 0x24f
        : null;
  if (sprite)
    calls.push({ operation: "queue", sprite_id: sprite, progress: 0 });
  if (flag) {
    calls.push({ operation: "random" });
    if (handle) calls.push({ operation: "stopSound", handle });
    calls.push({
      operation: "sound",
      request: [((random & 255) % 6) + 8, 3, 65536, 65536, 0],
    });
    soundHandle = newHandle;
  }
  return { soundHandle, field19c: 1, calls };
}
export function nativeRecoveryTick(progress, flag, handle, newHandle = 0) {
  const calls = [];
  let soundHandle = handle;
  if (flag && progress >= 0xac68) {
    if (handle) calls.push({ operation: "stopSound", handle });
    calls.push({ operation: "sound", request: [0x36, 3, 65536, 65536, 0] });
    flag = 0;
    soundHandle = newHandle;
  }
  if (progress >= 65536) calls.push({ operation: "state", target: 0x65 });
  return { flag, soundHandle, calls };
}
