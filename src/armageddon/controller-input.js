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
  if (!get(0xac) && host.wormState(get(0x3c),get(0x4c)) !== 100) {
    if (host.movement) host.movement(queue);
    else nativeCollectMovementInput(memory,queue,host);
  }
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
// Full00502220. Preserve key consumption and latch changes even when the
// replay ring rejects a command. State is queried again after primary input.
export function nativeCollectMovementInput(memory, queue, host) {
  const body = new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const get = offset => body.getInt32(offset,true);
  const special = state => [0x78,0x7b,0x7c,0x7d].includes(state);
  const payload = new Uint8Array(4);
  new DataView(payload.buffer).setInt32(0,get(0x3c),true);
  const emit = event => queue.writeEvent(event,payload);
  const latch = value => body.setInt32(0x108,value,true);
  const state = host.wormState(get(0x3c),get(0x4c));
  if (get(0xac) || get(0xe4)) return;
  const primary = special(state) ? 0x1d : 0x1b;
  if (state === 0x73 || get(0x64)) {
    if (state === 0x73 || special(state) || state === 0x79) {
      if (host.key(primary)) { emit(0x40e);emit(0x40f);host.consume(primary); }
    } else if (host.key(primary)) {
      if (!get(0x108)) { emit(0x40e);latch(1); }
    } else if (get(0x108)) { emit(0x40f);latch(0); }
  }
  const secondary = special(host.wormState(get(0x3c),get(0x4c))) ? 0x1b : 0x1d;
  if (secondary === 0x1b && get(0x108) && host.key(0x1b)) { host.consume(0x1b);latch(0); }
  if (host.key(secondary)) { emit(0x40c);host.consume(secondary); }
  if (host.key(0x28)) { host.consume(0x28);emit(0x40d); }
  for (const [key,event] of [[0x24,0x408],[0x25,0x409],[0x22,0x406],[0x23,0x407]]) {
    if (host.key(key)) emit(event);
  }
  if (!host.wormBusy(get(0x3c),get(0x4c)) && host.key(0x1a)) { emit(0x42b);host.consume(0x1a); }
}
