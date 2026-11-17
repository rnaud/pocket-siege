// Full004A1700. Root event3EC receives a native292-byte scratch packet whose
// first word is the queue pointer; the host represents that pointer as queue.
export function nativeCollectReplayInput(manager, queue, { collectRoot, collectDevice }) {
  if (manager.hasSnapshot) {
    const payload = new Uint8Array(8), view = new DataView(payload.buffer);
    view.setInt32(0, manager.captureFrame, true);
    view.setInt32(4, manager.checksum, true);
    queue.writeEvent(0x3f0, payload);
    manager.hasSnapshot = 0;
  }
  if (manager.pendingInputEvent) {
    queue.writeEvent(0x422, new Uint8Array());
    manager.pendingInputEvent = 0;
  }
  if (manager.inputMode < 0) {
    if (queue.percentUsed() < 50) collectDevice(queue);
  } else {
    collectRoot(queue, 0x3ec, 0x124);
    queue.writeEvent(0x3ea, new Uint8Array());
  }
}
