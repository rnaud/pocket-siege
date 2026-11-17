import { nativeWriteMatchController, nativeWritePhysicsEnvironment, nativeWriteReplayTask } from './replay-task.js';

// Full004A1E10. Device/audio calls are host interfaces; snapshot writing,
// sparse replay-state copies, flag transitions and checksum are composed ports.
export function nativeReplaySessionTick(sceneMemory, manager, { stream, recording, playback, device, audio }) {
  const view = new DataView(sceneMemory.buffer, sceneMemory.byteOffset, sceneMemory.byteLength);
  const get = offset => view.getInt32(offset, true);
  const put = (offset, value) => view.setInt32(offset, value, true);
  if (get(0x1d444) && playback.count === 0) {
    put(0x1d444, 0);
    put(0x1d448, 0);
    if (get(0x1240c) !== 1) {
      audio?.setSpeed(1);
      put(0x1240c, 1);
    }
  }
  if (!get(0x1d43c) && device.pending()) {
    device.clear();
    put(0x1d448, 0);
  }
  if (get(0x1d438) && !get(0x1d43c) && !get(0x1d444) && !get(0x1d428) && !get(0x1d42c)) {
    stream.reset();
    stream.writeBlock(sceneMemory.slice(0x7ec, 0x47a8));
    nativeWritePhysicsEnvironment(stream, manager.environment.state);
    const lists = { all: manager.environment.all.entries, categories: manager.environment.categories.map(list => list.entries) };
    nativeWriteMatchController(stream, { ...manager.root,
      presentation: manager.root.memory.slice(0x3c, 0x98), controller: manager.root.memory.slice(0xd8, 0x210),
    }, child => nativeWriteReplayTask(stream, child, lists));
    manager.globalCounter = 0;
    recording.clear();
    if (device.startRecording()) {
      put(0x1d430, get(0x7f0));
      put(0x1d43c, 1);
      put(0x1d448, 0);
      sceneMemory.copyWithin(0x1cad8, 0x1c188, 0x1c188 + 0x7e4);
      for (const offset of [0, 4, 8, 12, 20, 24, 28, 32]) put(0x1d2c0 + offset, get(0x1c970 + offset));
      sceneMemory.copyWithin(0x1d2e4, 0x1c994, 0x1cad8);
      manager.captureFrame = get(0x7f0);
      const deviceChecksum = device.checksum();
      manager.hasSnapshot = 1;
      manager.checksum = (deviceChecksum + stream.checksum()) | 0;
    }
  }
  if (!get(0x1d428)) put(0x1d438, 0);
  if (get(0x1d440) && !get(0x1d444) && !get(0x1d43c) && !device.startPlayback()) {
    manager.playbackError = -1;
    manager.playbackFailure = 1;
  }
  put(0x1d440, 0);
}
