import {nativeDestroyTaskMemory} from './task-destroy.js';

//004C9460: remove only the first occurrence, preserving sparse list slots.
export function nativeRemovePhysicsMemory(memory,environment,address) {
  memory.put(environment+4,0);
  for(const list of [environment+0x34+memory.get(address+0x3c)*0x1c,environment+0x18]) {
    for(let index=0;index<(memory.get(list+12)|0);index++) {
      const slot=memory.get(list+16)+index*4;
      if(memory.get(slot)===address) {memory.put(slot,0);memory.put(list+8,1);break;}
    }
  }
}

//004F4170 /004F41F0, then004ED9F0 and the base task destructor.
export function nativeDestroyPhysicsMemory(memory,address,flags,host) {
  memory.put(address,0x527548);
  if(memory.get(address+0xc8)) {
    host.free(memory.get(address+0xf8));memory.put(address+0xf8,0);memory.put(address+0xc8,0);
  }
  const scene=memory.get(address+0x38);
  nativeRemovePhysicsMemory(memory,memory.get(scene+0x7d4),address);
  const handle=memory.get(address+0xf4),device=memory.get(scene+12);
  if(handle&&device)host.stopSound(device,handle);
  memory.put(address,0x527478);nativeDestroyTaskMemory(memory,address,0,host);
  if(flags&1)host.release(address,0xfc);
  return address;
}
