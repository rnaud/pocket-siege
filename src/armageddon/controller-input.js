// Full005010E0, reached by controller event3EC. Collectors own their event
// payloads; this routine preserves the native gates, order and repeated queries.
export function nativeCollectControllerInput(memory, sceneMemory, queue, host) {
  const body = new DataView(memory.buffer, memory.byteOffset, memory.byteLength);
  const scene = new DataView(sceneMemory.buffer, sceneMemory.byteOffset, sceneMemory.byteLength);
  const get = offset => body.getInt32(offset, true);
  if (scene.getInt8(0x11d7c) !== get(0x44) || scene.getInt32(0x1d444,true) || !get(0x40)) return;
  if (get(0x70)) host.menu(queue);
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
