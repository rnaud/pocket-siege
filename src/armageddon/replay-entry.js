// Entry branch of004A30A0, ending before ordinary frame processing at004A325C.
// Returns true only when the caller should continue ordinary frame processing.
// Snapshot restoration is supplied by nativeRestoreReplaySnapshot's host adapter.
export function nativeReplayEntry(sceneMemory, manager, { device, restoreSnapshot, audio }) {
  const view = new DataView(sceneMemory.buffer, sceneMemory.byteOffset, sceneMemory.byteLength);
  const get = offset => view.getInt32(offset, true);
  const put = (offset, value) => view.setInt32(offset, value, true);
  const target = manager.playbackError < 0 ? 65536 : 0;
  let fade = get(0x12488);
  if (fade < target) fade = (fade + 0xf5c) | 0;
  else if (fade > target) fade = (fade - 0xf5c) | 0;
  fade = Math.max(0, Math.min(65536, fade));
  put(0x12488, fade);
  if ((manager.playbackError < 0 && fade === 65536) || (manager.playbackError > 0 && fade === 0)) manager.playbackError = 0;
  if (manager.playbackError !== 0) return false;
  if (!manager.playbackFailure) return true;
  if (device.readyForPlayback()) {
    put(0x1d434, get(0x7f0));
    restoreSnapshot();
    audio?.reset();
    put(0x12488, 65536);
    sceneMemory.copyWithin(0x1c188, 0x1cad8, 0x1cad8 + 0x7e4);
    for (const offset of [0, 4, 8, 12, 20, 24, 28, 32]) put(0x1c970 + offset, get(0x1d2c0 + offset));
    sceneMemory.copyWithin(0x1c994, 0x1d2e4, 0x1d2e4 + 0x144);
    put(0x1d444, 1);
    manager.playbackError = 1;
  }
  manager.playbackFailure = 0;
  return false;
}
