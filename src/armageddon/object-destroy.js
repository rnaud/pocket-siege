import {nativeReleasePresentationSlot} from './presentation-slot-memory.js';
import {nativeDestroyPhysicsMemory} from './physics-destroy.js';

//0048B7C0 /00492C50 image destruction; pixel storage may be borrowed.
export function nativeDestroyPanelImage(memory,address,flags,host) {
  memory.put(address,0x526390);
  if(!memory.get(address+4))host.free(memory.get(address+8));
  memory.put(address,0x524a14);if(flags&1)host.release(address,44);return address;
}
//004C66B0: normal and faded cached images are independently owned.
export function nativeDestroyPanelText(memory,address,flags,host) {
  memory.put(address,0x5268a4);
  for(const offset of [12,16]) {
    const image=memory.get(address+offset);
    if(image)nativeDestroyPanelImage(memory,image,1,host);
  }
  memory.put(address,0x524a14);if(flags&1)host.release(address,0x138);return address;
}
//004D1380.
export function nativeDestroyBarrelMemory(memory,address,flags,host) {
  memory.put(address,0x526988);
  nativeReleasePresentationSlot(memory,memory.get(address+0x38),memory.get(address+0x100)|0);
  nativeDestroyPhysicsMemory(memory,address,0,host);
  if(flags&1)host.release(address,0x110);return address;
}
//004E9790: mine table membership, presentation rank, text, then physics.
export function nativeDestroyMineMemory(memory,address,flags,host) {
  memory.put(address,0x527300);const scene=memory.get(address+0x38);
  memory.put(scene+0x450+memory.get(address+0x100)*4,0);
  nativeReleasePresentationSlot(memory,scene,memory.get(address+0x110)|0);
  const text=memory.get(address+0x190);if(text)nativeDestroyPanelText(memory,text,1,host);
  nativeDestroyPhysicsMemory(memory,address,0,host);
  if(flags&1)host.release(address,0x194);return address;
}
