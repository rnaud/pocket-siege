import { nativeReplayEntry } from './replay-entry.js';

// Offline004A30A0 orchestration. Internal frame/input/render routines remain
// explicit adapters; dispatchEvents can compose nativeDispatchReplayEvents.
export function nativeReplayFrame(sceneMemory, manager, adapters) {
  const view = new DataView(sceneMemory.buffer, sceneMemory.byteOffset, sceneMemory.byteLength);
  const get = offset => view.getInt32(offset, true);
  if (get(0x20)) throw new Error('Online replay is outside the offline port');
  if (!nativeReplayEntry(sceneMemory, manager, adapters)) return;
  if (adapters.audio) adapters.updateAudio();
  if (!manager.paused) {
    const playback = get(0x1d444) !== 0;
    const queue = playback ? adapters.recording : adapters.incoming;
    if (!playback) adapters.collectInput(queue);
    adapters.dispatchEvents(queue);
    for (let remaining = 50; get(0x1d448) && remaining > 0; remaining--) {
      if (playback) {
        adapters.advancePlayback();
        adapters.dispatchRoot(0x3ed, new Uint8Array());
        if (!manager.suppressRender) adapters.renderFrame();
      } else adapters.advanceInput();
      adapters.dispatchEvents(queue);
    }
  }
  view.setInt32(0x1b8ec, get(0x1b8ec) + 1, true);
  if (!manager.abortValue) {
    const status = new Uint8Array(0x154);
    adapters.queryRoot(0x7d2, status);
    // Original checks the second word in the output buffer, not EAX.
    if (new DataView(status.buffer).getInt32(4, true)) {
      manager.abortValue = 3;
      manager.abortMode = 4;
      manager.abortFirst = 0;
      manager.abortSecond = 0;
    }
  }
}
