import {nativeCreatePhysicsAt} from './physics-memory.js';
import {nativeRegisterTaskMemory} from './task-memory.js';
import {nativeQueryCollisionMemory} from './collision-registry.js';
import {nativeInitializeReplayPresentationAt} from './replay-presentation-restore.js';

//004D1F80 with shared004D21C0/004D2770/004D2050 resource initialization.
export function nativeCreateLandscapeAt(memory,address,parent,host) {
  nativeCreatePhysicsAt(memory,address,parent,1,1,host);
  memory.put(address,0x526ad0);memory.put(address+0x2c,28);
  for(const [offset,value] of [[0x104,0],[0xfc,1920],[0x100,696],[0x108,0]])memory.put(address+offset,value);
  const scene=memory.get(address+0x38);
  nativeInitializeReplayPresentationAt(memory,address,scene,host);
  if(!nativeQueryCollisionMemory(memory,memory.get(scene+0x7d4),address,0,0,memory.get(address+0xf0),memory.get(address+0x40),host.collisionOverlap))
    for(const offset of [0x90,0x94,0xb8])memory.put(address+offset,0);
  memory.put(address+0x54,1);memory.put(address+0x48,1);
  nativeRegisterTaskMemory(memory,address,1,0,host);return address;
}
