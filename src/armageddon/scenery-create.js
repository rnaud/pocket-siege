import {nativeCreateTaskMemory} from './task-memory.js';
import {nativeCreateEventGroup,nativeSetGroupSubscription} from './event-group.js';

//004D4C70: scenery actors inherit scene ownership but have no registry entry.
export function nativeCreateSceneryAt(memory,address,parent,layer,depth,x,y,speed,host) {
  nativeCreateTaskMemory(memory,address,parent,host);
  const put=(offset,value)=>memory.put(address+offset,value);
  put(0,0x527478);put(0x2c,2);put(0x38,memory.get(parent+0x38));
  put(0,0x526c78);put(0x2c,23);
  put(0x4c,x);put(0x50,y);put(0x54,speed);put(0x40,(x+y)&0xffff);
  put(0x3c,depth);put(0x58,0);put(0x5c,0);
  if(layer>=0&&layer<=2){put(0x44,[0x200,0x166,0xcc][layer]);put(0x48,7+layer);}
  return address;
}

//004EBE10: independent fixed-seed scenery stream, skipped in low detail.
export function nativePopulateSceneryAt(memory,address,setup,host) {
  const scene=memory.get(address+0x38);
  if(memory.get(scene+0x1b8ac))return;
  const storage=host.allocate(0xa0);
  const group=storage?nativeCreateEventGroup(memory,storage,address,27,0,host):0;
  for(const event of [0x3e9,0x3ea,0x3eb,0x43c])nativeSetGroupSubscription(memory,group,event,true);
  const detail=memory.get(scene+0x1b8ac),count=detail?10:32;
  const width=(memory.get(scene+0x1b8d0)-memory.get(scene+0x1b8cc))>>16;
  let seed=0x12345678;
  const advance=()=>seed=(Math.imul(seed,0x19660d)+0x3c6ef35f)|0;
  for(let i=0;i<count;i++) {
    const x=((memory.get(scene+0x1b8cc)>>16)+(seed&0xffff)%width)<<16;
    advance();let speed=(seed&0xffff)+0x8000;
    advance();if(seed&0x10000)speed=-speed;advance();
    const at=host.allocate(0x60);
    if(at)nativeCreateSceneryAt(memory,at,group,2-Math.trunc(3*i/count),0x190000-i,x,((detail?43:-213)+Math.trunc(69*i/count))<<16,speed,host);
  }
}
