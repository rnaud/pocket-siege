// Full005010E0, reached by controller event3EC. Collectors own their event
// payloads; this routine preserves the native gates, order and repeated queries.
export function nativeCollectControllerInput(memory, sceneMemory, queue, host) {
  const body = new DataView(memory.buffer, memory.byteOffset, memory.byteLength);
  const scene = new DataView(sceneMemory.buffer, sceneMemory.byteOffset, sceneMemory.byteLength);
  const get = offset => body.getInt32(offset, true);
  if (scene.getInt8(0x11d7c) !== get(0x44) || scene.getInt32(0x1d444,true) || !get(0x40)) return;
  if (get(0x70)) {
    if (host.menu) host.menu(queue);
    else nativeCollectMenuInput(memory,sceneMemory,queue,host);
  }
  if (get(0x48) || get(0x74)) return;
  host.pointer(queue);
  host.keyboard(queue);
  const controller = get(0xf0);
  if (controller < 0) return;
  const count = scene.getInt16(0x1b8aa,true);
  let index = 0;
  while (index < count && scene.getInt16(0x1b88a + index * 2,true) !== controller) index++;
  if (index >= count || index !== 0) return;
  if (get(0x84) && host.wormState(get(0x3c),get(0x4c)) !== 100) host.weapon(queue);
  if (!get(0xac) && host.wormState(get(0x3c),get(0x4c)) !== 100) host.movement(queue);
}

// Full00501FF0 with004AAAB0 key classification. Query0x7D3's word at1C
// chooses the alternate confirm binding alongside rope/parachute worm states.
export function nativeCollectMenuInput(memory, sceneMemory, queue, host) {
  const body = new DataView(memory.buffer, memory.byteOffset, memory.byteLength);
  const scene = new DataView(sceneMemory.buffer, sceneMemory.byteOffset, sceneMemory.byteLength);
  const get = offset => body.getInt32(offset,true);
  const team = get(0x3c), controller = get(0xf0), count = scene.getInt16(0x1b8aa,true);
  if (controller < 0 || count < 1 || scene.getInt16(0x1b88a,true) !== controller) return;
  const worm = host.lookup(2, ((get(0x3c) << 4) + get(0x4c)) | 0);
  const info = host.wormQuery(worm,0x7d3,0x154);
  const state = host.wormState(get(0x3c),get(0x4c));
  const view = new DataView(info.buffer,info.byteOffset,info.byteLength);
  const key = [0x78,0x7b,0x7c,0x7d].includes(state) || view.getInt32(0x1c,true) ? 0x1d : 0x1b;
  const payload = new Uint8Array(4);
  new DataView(payload.buffer).setInt32(0,team,true);
  if (get(0x78)) {
    if (host.key(key)) {
      if (!get(0x108)) { host.consume(key); queue.writeEvent(0x414,payload); }
    } else body.setInt32(0x108,0,true);
  }
  if (!get(0x74)) return;
  if (host.key(0x22)) queue.writeEvent(0x415,payload);
  if (host.key(0x23)) queue.writeEvent(0x416,payload);
}
