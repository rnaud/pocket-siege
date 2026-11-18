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
