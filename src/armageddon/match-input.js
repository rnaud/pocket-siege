import {nativeForwardTaskEventMemory} from './task-memory.js';
import {nativeAppendSceneEvent} from './scene-buffers.js';

//Offline004B4CE0 event3EC. Child collectors run before the match's Escape
//collector, and may change activation, priority ownership or the child list.
export function nativeCollectMatchInput(memory,root,sender,size,payload,host) {
  if(memory.get(memory.get(root+0x38)+0x20))throw new Error('Online input is outside the offline port');
  nativeForwardTaskEventMemory(memory,root,sender,0x3ec,size,payload,host.dispatchTask);
  if(!memory.get(root+0x19c))return;
  const scene=memory.get(root+0x38),short=at=>(memory.byte(at)|(memory.byte(at+1)<<8))<<16>>16;
  for(let i=0;i<short(scene+0x1b8aa);i++) {
    if(short(scene+0x1b88a+i*2)!==(memory.get(root+0x284)|0))continue;
    if(i!==0)return;
    const keyboard=memory.get(scene+4);
    if(!host.key(keyboard,0x1b))return;
    const queue=new DataView(payload.buffer,payload.byteOffset,payload.byteLength).getUint32(0,true);
    nativeAppendSceneEvent(memory,queue,0x3ff,new Uint8Array());
    host.consume(keyboard,0x1b);return;
  }
}
