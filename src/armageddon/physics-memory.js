import {nativeCompactPhysicsEntries} from './physics-compaction.js';
import {nativeCreateTaskMemory} from './task-memory.js';
import {nativeInitializePhysics} from './physics-create.js';

//004C8F80. Original sparse membership, backing buffers and growth ordering.
export function nativeRegisterPhysicsMemory(memory,environment,address,host) {
  memory.put(environment+4,0);
  const insert=(list,index)=>{
    const append=value=>{
      if((memory.get(list+4)|0)<=(memory.get(list+12)|0)) {
        memory.put(list+4,memory.get(list+4)*2);host.free(memory.get(list+20));
        const replacement=host.allocateArray(memory.get(list+4)<<2,0x561f5c);memory.put(list+20,replacement);
        const source=memory.get(list+16),length=memory.get(list+12)<<2;
        for(let i=0;i<length;i++)memory.putByte(replacement+i,memory.byte(source+i));
        host.free(memory.get(list+16));memory.put(list+16,memory.get(list+20));
        memory.put(list+20,host.allocateArray(memory.get(list+4)<<2,0x561f5c));
      }
      memory.put(memory.get(list+16)+memory.get(list+12)*4,value);memory.put(list+12,memory.get(list+12)+1);
    };
    if(index<0)append(address);
    else {
      while((memory.get(list+12)|0)<=index)append(0);
      const slot=memory.get(list+16)+index*4;
      if(!memory.get(slot))memory.put(slot,address);
    }
  };
  insert(environment+0x18,memory.get(address+0xe8)|0);
  insert(environment+0x34+memory.get(address+0x3c)*0x1c,memory.get(address+0xe4)|0);
  memory.put(address+0xf0,memory.get(memory.get(environment+0x3c0)+0x3a4+memory.get(address+0x44)*4));
}

//004F4000 with native task attachment and environment membership.
export function nativeCreatePhysicsAt(memory,address,parent,category,shape,host) {
  const scene=memory.get(parent+0x38);
  nativeInitializePhysics(memory.range(address,0xfc),memory.range(scene,0x20000),category,shape,{
    initializeTask:type=>{nativeCreateTaskMemory(memory,address,parent,host);memory.put(address,0x527548);memory.put(address+0x2c,type);memory.put(address+0x38,scene);},
    registerPhysics:()=>nativeRegisterPhysicsMemory(memory,memory.get(scene+0x7d4),address,host),
  });
  return address;
}

//004CA7E0: stable compaction of dirty lists only. Inactive buffer tails survive.
export function nativeCompactPhysicsMemory(memory,environment) {
  for(let index=0;index<33;index++) {
    const list=environment+(index===0?0x18:0x34+(index-1)*0x1c);
    if(!memory.get(list+8))continue;
    const source=memory.get(list+16),target=memory.get(list+20);
    const count=nativeCompactPhysicsEntries(memory.get(list+12),
      index=>memory.get(source+index*4),(index,body)=>memory.put(target+index*4,body));
    memory.put(list+24,source);memory.put(list+16,target);memory.put(list+20,source);
    memory.put(list+12,count);memory.put(list+8,0);
  }
}

//004C8BB0/004C8D10: fresh environment with two native buffers per list.
function nativeInitializeEnvironmentStorage(memory,address,maskRegistry,host) {
  memory.put(address,0x524a14);
  for(let index=0;index<33;index++) {
    const list=address+(index===0?0x18:0x34+(index-1)*0x1c);
    memory.put(list,0x5268b4);memory.put(list+4,256);memory.put(list+8,0);memory.put(list+12,0);
    memory.put(list+16,host.allocateArray(1024,0x561f5c));
    memory.put(list+20,host.allocateArray(memory.get(list+4)<<2,0x561f5c));
  }
  memory.put(address,0x5268b8);memory.put(address+0x3c0,maskRegistry);
}
export function nativeCreateEnvironmentMemory(memory,address,maskRegistry,host) {
  nativeInitializeEnvironmentStorage(memory,address,maskRegistry,host);
  memory.put(address+0x3b8,0);memory.put(address+0x3bc,0);memory.put(address+4,0);
  return address;
}

//004C8E40: restore the original owned list storage and aligned state block.
//The stream marker is consumed without validation, just as in the executable.
export function nativeReadEnvironmentMemory(memory,address,maskRegistry,stream,host) {
  nativeInitializeEnvironmentStorage(memory,address,maskRegistry,host);
  stream.readByte();
  memory.range(address+0x3b4,12).set(stream.readBlock(12));
  memory.put(address+4,0);
  return address;
}
