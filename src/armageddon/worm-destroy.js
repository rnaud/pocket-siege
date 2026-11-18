import {nativeReleasePresentationSlot} from './presentation-slot-memory.js';
import {nativeDestroyPanelImage,nativeDestroyPanelText} from './object-destroy.js';
import {nativeDestroyPhysicsMemory} from './physics-destroy.js';
import {nativeDestroyTaskMemory} from './task-destroy.js';

function releasePlain(memory,address,size,host) {
  memory.put(address,0x524a14);host.release(address,size);
}
function releaseImageOwner(memory,address,vtable,offset,size,host) {
  memory.put(address,vtable);const image=memory.get(address+offset);
  if(image)nativeDestroyPanelImage(memory,image,1,host);
  releasePlain(memory,address,size,host);
}
//004D6210/004D6320 with native animation, text and panel resource destructors.
export function nativeDestroyWormMemory(memory,address,flags,host) {
  memory.put(address,0x526de0);const scene=memory.get(address+0x38);
  nativeReleasePresentationSlot(memory,scene,memory.get(address+0x158)|0);
  memory.put(scene+0x1b94+memory.get(address+0xfc)*0x51c+memory.get(address+0x100)*0x9c-0x4fc,0);
  for(const offset of [0x388,0x38c]) {
    const handle=memory.get(address+offset),device=memory.get(scene+12);
    if(handle&&device)host.stopSound(device,handle);
    memory.put(address+offset,0);
  }
  if(memory.get(address+0x13c))memory.put(scene+0x12460,memory.get(scene+0x12460)-1);
  const animation=memory.get(address+0x350);if(animation)releasePlain(memory,animation,0x164,host);
  for(const offset of [0x338,0x33c,0x340,0x344,0x348,0x34c]) {
    const text=memory.get(address+offset);if(text)nativeDestroyPanelText(memory,text,1,host);
  }
  const panel=memory.get(address+0x358);if(panel)releaseImageOwner(memory,panel,0x527690,48,0x34,host);
  nativeDestroyPhysicsMemory(memory,address,0,host);
  if(flags&1)host.release(address,0x390);return address;
}

//004E5100 signed16 priority pools retain inactive tail words after removal.
export function nativeReleasePriorityMemory(memory,address,field,free,freeCount,priorities,active,activeCount,allowNegative=false,scene=memory.get(address+0x38)) {
  const slot=memory.get(address+field)|0;
  if(slot<0&&!allowNegative)return;
  const get=offset=>(memory.byte(scene+offset)|(memory.byte(scene+offset+1)<<8))<<16>>16;
  const put=(offset,value)=>{memory.putByte(scene+offset,value&255);memory.putByte(scene+offset+1,(value>>8)&255);};
  for(let i=0;i<get(activeCount);i++) {
    if(get(active+i*2)!==slot)continue;
    put(free+get(freeCount)*2,slot);put(freeCount,get(freeCount)+1);
    for(;i<get(activeCount)-1;i++){put(priorities+i*2,get(priorities+(i+1)*2));put(active+i*2,get(active+(i+1)*2));}
    memory.put(address+field,-1);put(activeCount,get(activeCount)-1);break;
  }
}
//004E5060/004E5100. Fresh controller children are worms; other derived task
//types must provide their virtual deletion through host.destroyChild.
export function nativeDestroyTeamControllerMemory(memory,address,flags,host) {
  memory.put(address,0x5271b8);
  nativeReleasePriorityMemory(memory,address,0xf0,0x1b848,0x1b868,0x1b86a,0x1b88a,0x1b8aa);
  nativeReleasePriorityMemory(memory,address,0xe8,0x1b778,0x1b798,0x1b79a,0x1b7ba,0x1b7da);
  nativeReleasePriorityMemory(memory,address,0xec,0x1b7e0,0x1b800,0x1b802,0x1b822,0x1b842);
  nativeReleasePriorityMemory(memory,address,0xf4,0x1b778,0x1b798,0x1b79a,0x1b7ba,0x1b7da);
  const portrait=memory.get(address+0x110);if(portrait)releasePlain(memory,portrait,0x170,host);
  const text=memory.get(address+0x11c);if(text)nativeDestroyPanelText(memory,text,1,host);
  const frame=memory.get(address+0x114);if(frame)releaseImageOwner(memory,frame,0x5277c0,56,0x3c,host);
  memory.put(address,0x527478);
  nativeDestroyTaskMemory(memory,address,0,{...host,destroyChild:host.destroyChild??((child,flags)=>{
    if(memory.get(child)!==0x526de0)throw new RangeError('Unsupported controller child destructor');
    return nativeDestroyWormMemory(memory,child,flags,host);
  })});
  if(flags&1)host.release(address,0x120);return address;
}
