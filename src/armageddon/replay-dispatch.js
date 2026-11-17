//004A1A00 offline path (auxiliary forwarding count is zero). Queue operations
//are native ports; root/environment dispatch and audio remain host interfaces.
export function nativeDispatchReplayEvents(sceneMemory, manager, { incoming, recording, dispatch, flushRoot, flushEnvironment, sessionTick, playSound }) {
  const view = new DataView(sceneMemory.buffer, sceneMemory.byteOffset, sceneMemory.byteLength);
  const get = offset => view.getInt32(offset, true);
  const put = (offset, value) => view.setInt32(offset, value, true);
  if (get(0x1ab8)) for (const offset of [0x15948, 0x15740, 0x1316c]) put(offset, 100000000);
  if (get(0x800)) put(0x800, (get(0x800) - 1) | 0);
  for (let offset = 20; offset <= 280; offset += 20) put(0x12490 + offset, 0);
  put(0x12490, 0);
  put(0x7f4, 1);
  dispatch(0x3e9, new Uint8Array(0));
  for (;;) {
    const record = incoming.readEvent();
    if (record === null) {
      dispatch(0x3ea, new Uint8Array(0));
      break;
    }
    const { event } = record;
    const payload = Uint8Array.from(record.payload);
    if (event === 0x3fe) {
      manager.abortValue = new DataView(payload.buffer, payload.byteOffset, payload.byteLength).getInt32(0, true);
      manager.abortFirst = 0;
      manager.abortSecond = 0;
      manager.abortMode = 4;
      break;
    }
    if (event !== 0x3f0) {
      if (get(0x1d43c)) {
        if (recording.percentUsed() < 96) recording.writeEvent(event, payload);
        else put(0x1d43c, 0);
      }
      dispatch(event, payload);
    }
    if (event === 0x3ea) break;
  }
  flushRoot();
  flushEnvironment();
  put(0x7f4, 0);
  put(0x7f0, (get(0x7f0) + 1) | 0);
  sessionTick(incoming);
  if (!get(0x1d448)) {
    for (let i = 0; i < get(0x1cad4); i++) {
      playSound?.(...Array.from({ length: 5 }, (_, field) => get(0x1c994 + i * 20 + field * 4)));
    }
  }
  put(0x1cad4, 0);
}
