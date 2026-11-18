import {nativeCompactPhysicsEntries} from './physics-compaction.js';
//Address-backed004B1AE0. The logical task API remains in task-create.js.
export function nativeCreateTaskMemory(memory,address,parent,host) {
  const put=(offset,value)=>memory.put(address+offset,value);
  put(0,0x524a14);put(16,0);put(20,0);put(8,0x5266fc);put(12,16);
  put(24,host.allocateArray(64,0x561f5c));put(28,host.allocateArray(memory.get(address+12)<<2,0x561f5c));
  put(0,0x526700);put(36,0);put(40,0);put(4,0);put(44,1);
  if(parent) {
    put(52,0);put(48,memory.get(parent+48));
    if((memory.get(parent+12)|0)<=(memory.get(parent+20)|0)) {
      memory.put(parent+12,memory.get(parent+12)*2);host.free(memory.get(parent+28));
      const replacement=host.allocateArray(memory.get(parent+12)<<2,0x561f5c);memory.put(parent+28,replacement);
      const source=memory.get(parent+24),length=memory.get(parent+20)<<2;
      for(let i=0;i<length;i++)memory.putByte(replacement+i,memory.byte(source+i));
      host.free(memory.get(parent+24));memory.put(parent+24,memory.get(parent+28));
      memory.put(parent+28,host.allocateArray(memory.get(parent+12)<<2,0x561f5c));
    }
    memory.put(memory.get(parent+24)+memory.get(parent+20)*4,address);
    memory.put(parent+20,memory.get(parent+20)+1);put(4,parent);
  } else {
    put(52,1);const registry=host.allocate(0x404);
    if(registry){memory.put(registry,0x526950);for(let i=1;i<=256;i++)memory.put(registry+i*4,0);}
    put(48,registry);
  }
  return address;
}

//004B2670/004CCE30. Prepend original registry nodes; signed remainder preserved.
export function nativeRegisterTaskMemory(memory,address,type,index,host) {
  memory.put(address+40,type);memory.put(address+36,index);
  const registry=memory.get(address+48),node=host.allocate(20);
  if(node)memory.put(node,0x526954);
  const bucket=((Math.imul(index,17)+type)|0)%256,head=registry+4+bucket*4;
  memory.put(node+4,memory.get(head));memory.put(node+8,type);memory.put(node+12,index);memory.put(node+16,address);memory.put(head,node);
  return 1;
}

//004B26F0. Re-read count and backing array after every receiver callback.
export function nativeForwardTaskEventMemory(memory,address,sender,event,size,payload,dispatch) {
  let index=0;
  while(index<(memory.get(address+20)|0)) {
    const child=memory.get(memory.get(address+24)+index++*4);
    if(child)dispatch(child,sender,event,size,payload);
  }
}

//004CCF50/004B26A0. First matching node wins, even with duplicate keys.
export function nativeLookupTaskMemory(memory,registry,type,index) {
  const bucket=((Math.imul(index,17)+type)|0)%256;
  let node=memory.get(registry+4+bucket*4);
  while(node) {
    if((memory.get(node+8)|0)===(type|0)&&(memory.get(node+12)|0)===(index|0))return memory.get(node+16);
    node=memory.get(node+4);
  }
  return 0;
}
export function nativeSendTaskEventMemory(memory,address,sender,type,index,event,size,payload,dispatch) {
  const target=nativeLookupTaskMemory(memory,memory.get(address+48),type,index);
  if(!target)return 0;
  dispatch(target,sender,event,size,payload);return 1;
}

//004B2A00: children may mutate the parent list while their virtual+18 runs.
//Only compact after all surviving/appended children have been visited.
export function nativeCleanupTaskMemory(memory,address,cleanupChild=child=>nativeCleanupTaskMemory(memory,child)) {
  let index=0;
  while(index<(memory.get(address+20)|0)) {
    const child=memory.get(memory.get(address+24)+index++*4);
    if(child)cleanupChild(child);
  }
  if(!memory.get(address+16))return;
  const source=memory.get(address+24),target=memory.get(address+28);
  const count=nativeCompactPhysicsEntries(memory.get(address+20),
    index=>memory.get(source+index*4),(index,child)=>memory.put(target+index*4,child));
  memory.put(address+32,source);memory.put(address+24,target);memory.put(address+28,source);
  memory.put(address+20,count);memory.put(address+16,0);
}
