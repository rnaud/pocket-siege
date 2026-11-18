import {nativeSendTaskEventMemory} from './task-memory.js';
import {nativeReleasePresentationSlot} from './presentation-slot-memory.js';
import {nativeDestroyPanelText} from './object-destroy.js';
import {nativeDestroyPhysicsMemory} from './physics-destroy.js';

//004E1D00/004E1DC0 and the concrete actor's004E4170 state exit.
//Only the first word of these native stack messages is initialized. Receivers
//must not infer state from the remaining unspecified payload bytes.
export function nativeDestroyWeaponActorMemory(memory,address,flags,host) {
  memory.put(address,0x527090);
  const send=event=>{
    const payload=new Uint8Array(0x124);new DataView(payload.buffer).setUint32(0,memory.get(address+0x130),true);
    nativeSendTaskEventMemory(memory,address,address,20,0,event,payload.length,payload,host.dispatchTask);
  };
  const stop=offset=>{
    const handle=memory.get(address+offset);
    if(handle){const device=memory.get(memory.get(address+0x38)+12);if(device)host.stopSound(device,handle);memory.put(address+offset,0);}
  };
  if(memory.get(address+0x130))send(0x436);
  nativeReleasePresentationSlot(memory,memory.get(address+0x38),memory.get(address+0x12c)|0);
  stop(0x3d8);stop(0x3d4);
  if(memory.get(address+0x3a8))send(0x43b);
  if(memory.get(address+0x394)===1) {
    for(const offset of [0x9c,0xa0])memory.put(address+offset,Math.trunc((memory.get(address+offset)|0)/3));
    memory.put(address+0x394,2);memory.put(address+0x54,0);
    memory.put(address+0x3c8,(memory.get(address+0x398)&0xffff)<0x8000?1:-1);
    if(memory.get(address+0x130))send(0x438);
    if(memory.get(address+0x378))stop(0x3d8);
    memory.put(address+0x40,memory.get(address+0x2d4)|memory.get(address+0x334));
  }
  for(const offset of [0x3cc,0x3d0]){const text=memory.get(address+offset);if(text)nativeDestroyPanelText(memory,text,1,host);}
  nativeDestroyPhysicsMemory(memory,address,0,host);
  if(flags&1)host.release(address,0x3e0);return address;
}
