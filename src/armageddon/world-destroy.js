import {nativeDestroyTaskMemory} from './task-destroy.js';
import {nativeDestroyPhysicsMemory} from './physics-destroy.js';
import {nativeDestroyPanelText,nativeDestroyPanelImage,nativeDestroyMineMemory,nativeDestroyBarrelMemory} from './object-destroy.js';
import {nativeDestroyTeamControllerMemory,nativeDestroyWormMemory,nativeReleasePriorityMemory} from './worm-destroy.js';

//004B2D10/004B2DC0 and004EAE20: match/world resources precede child teardown.
export function nativeDestroyMatchRootMemory(memory,address,flags,host) {
  memory.put(address,0x526720);
  for(const offset of [0x210,0x214,0x21c,0x218]) {
    const resource=memory.get(address+offset);
    if(resource)(offset===0x21c?nativeDestroyPanelImage:nativeDestroyPanelText)(memory,resource,1,host);
  }
  nativeReleasePriorityMemory(memory,address,0x284,0x1b848,0x1b868,0x1b86a,0x1b88a,0x1b8aa,true);
  memory.put(address,0x527458);
  for(const offset of [0xd0,0xd4]) {const text=memory.get(address+offset);if(text)nativeDestroyPanelText(memory,text,1,host);}
  const scene=memory.get(address+0x38);
  for(const offset of [0xac,0xb0,0xc4,0xc8,0xbc,0xc0]) {
    const handle=memory.get(address+offset),device=memory.get(scene+12);
    if(handle&&device)host.stopSound(device,handle);
  }
  nativeReleasePriorityMemory(memory,address,0xcc,0x1b778,0x1b798,0x1b79a,0x1b7ba,0x1b7da,true);
  memory.put(address,0x527478);nativeDestroyTaskMemory(memory,address,0,host);
  if(flags&1)host.release(address,0x28c);return address;
}

//Virtual destruction for the task types constructed by the recovered fresh
//world. Reject unknown runtime types until their owned resources are ported.
export function nativeDestroyWorldTaskMemory(memory,address,flags,host) {
  const vtable=memory.get(address);
  const nested={...host,destroyChild:(child,childFlags)=>nativeDestroyWorldTaskMemory(memory,child,childFlags,host)};
  const specialized={0x526720:nativeDestroyMatchRootMemory,0x5271b8:nativeDestroyTeamControllerMemory,
    0x526de0:nativeDestroyWormMemory,0x527300:nativeDestroyMineMemory,0x526988:nativeDestroyBarrelMemory};
  if(specialized[vtable])return specialized[vtable](memory,address,flags,nested);
  if(vtable===0x526700)return nativeDestroyTaskMemory(memory,address,flags,nested);
  if(vtable===0x527548)return nativeDestroyPhysicsMemory(memory,address,flags,nested);
  const size={0x526ad0:0x175c,0x527428:0xa0,0x526c78:0x60,0x527070:0xc40,0x5277e0:0x640}[vtable];
  if(size===undefined)throw new RangeError(`Unsupported world task destructor ${vtable.toString(16)}`);
  memory.put(address,vtable);
  if(vtable===0x526ad0)nativeDestroyPhysicsMemory(memory,address,0,nested);
  else {memory.put(address,0x527478);nativeDestroyTaskMemory(memory,address,0,nested);}
  if(flags&1)host.release(address,size);return address;
}
