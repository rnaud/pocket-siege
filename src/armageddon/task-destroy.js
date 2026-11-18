import {nativeCleanupTaskMemory} from './task-memory.js';

//004CCED0: unlink the first matching registry key, then destroy its node.
export function nativeUnregisterTaskMemory(memory,registry,type,index,host) {
  const head=registry+4+(((Math.imul(index,17)+type)|0)%256)*4;
  let previous=0,node=memory.get(head);
  while(node) {
    if((memory.get(node+8)|0)===(type|0)&&(memory.get(node+12)|0)===(index|0)) {
      memory.put(previous?previous+4:head,memory.get(node+4));
      memory.put(node,0x524a14);host.release(node,20);return 1;
    }
    previous=node;node=memory.get(node+4);
  }
  return 0;
}

//004B1C60 base task destructor. Derived tasks supply their virtual destructor
//through destroyChild; the default recursively destroys base-task trees.
export function nativeDestroyTaskMemory(memory,address,flags,host) {
  const parent=memory.get(address+4);memory.put(address,0x526700);
  if(parent) {
    for(let index=0;index<(memory.get(parent+20)|0);index++) {
      const slot=memory.get(parent+24)+index*4;
      if(memory.get(slot)===address) {memory.put(slot,0);memory.put(parent+16,1);break;}
    }
    memory.put(address+4,0);
  }
  nativeCleanupTaskMemory(memory,address,child=>host.destroyChild?
    host.destroyChild(child,1):nativeDestroyTaskMemory(memory,child,1,host));
  const type=memory.get(address+40)|0;
  if(type)nativeUnregisterTaskMemory(memory,memory.get(address+48),type,memory.get(address+36)|0,host);
  if(memory.get(address+52)&&memory.get(address+48)) {
    const registry=memory.get(address+48);memory.put(registry,0x524a14);host.release(registry,0x404);
  }
  memory.put(address+8,0x5266fc);host.free(memory.get(address+24));host.free(memory.get(address+28));
  memory.put(address,0x524a14);memory.put(address+8,0x524a14);
  if(flags&1)host.release(address,0x38);
  return address;
}
