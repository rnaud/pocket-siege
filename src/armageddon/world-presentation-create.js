import {nativeCreateTaskMemory,nativeRegisterTaskMemory} from './task-memory.js';
import {nativeCreatePanelText} from './panel-resources.js';

//004EAF40 including004E1500 and005029A0 presentation task constructors.
export function nativeInitializeWorldPresentation(memory,address,host) {
  const scene=memory.get(address+0x38);
  for(const [size,vtable,type,tail,registration] of [[0xc40,0x527070,13,0xc3c,26],[0x640,0x5277e0,14,0x63c,19]]) {
    const at=host.allocate(size);
    if(at) {
      nativeCreateTaskMemory(memory,at,address,host);
      memory.put(at,0x527478);memory.put(at+0x2c,2);memory.put(at+0x38,scene);
      memory.put(at,vtable);memory.put(at+0x2c,type);memory.put(at+tail,0);
      nativeRegisterTaskMemory(memory,at,registration,0,host);
    }
  }
  for(const [offset,font,width] of [[0xd0,23,memory.get(scene+0x1b8dc)],[0xd4,28,128]]) {
    const at=host.allocate(0x138);
    memory.put(address+offset,at?nativeCreatePanelText(memory,at,memory.get(scene+8),font,width,host):0);
  }
  for(const offset of [0x98,0x9c,0xa0,0xa4,0xa8,0xb0,0xb4,0xb8,0xc4,0xc8,0xbc,0xc0,0xac])memory.put(address+offset,0);
  const bytes=memory.range(scene,0x20000),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const get=offset=>view.getInt16(offset,true),put=(offset,value)=>view.setInt16(offset,value,true);
  const count=get(0x1b798);
  if(!count){memory.put(address+0xcc,-1);return;}
  put(0x1b798,count-1);
  const id=get(0x1b778+get(0x1b798)*2),length=get(0x1b7da);
  let slot=0;
  while(slot<length&&get(0x1b79a+slot*2)>=1)slot++;
  for(let i=length;i>slot;i--) {
    put(0x1b79a+i*2,get(0x1b79a+(i-1)*2));
    put(0x1b7ba+i*2,get(0x1b7ba+(i-1)*2));
  }
  put(0x1b79a+slot*2,0);put(0x1b7ba+slot*2,id);put(0x1b7da,length+1);
  memory.put(address+0xcc,id);
}
