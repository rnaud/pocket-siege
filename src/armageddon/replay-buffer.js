import {
  nativeAllocateEventRecord,nativeAppendSceneEvent,nativeResetEventBuffer,
  nativeEventBufferCount,nativeEventBufferUsage,nativePeekEventRecord,
  nativeConsumeEventRecord,nativeContainsEventRecord,nativeCopyEventBuffer,nativeReadSceneEvent,
} from './scene-buffers.js';

//Replay's offset-based API now uses the same native linked-record memory as
//scene initialization and shutdown. Address zero remains the null pointer.
const WRAPPER=0,BUFFER=8,DATA=64;
export class NativeReplayBuffer {
  constructor(capacity) {
    this.storage=new Uint8Array(DATA+capacity+304);
    const view=new DataView(this.storage.buffer);
    this.memory={get:at=>view.getUint32(at,true),put:(at,v)=>view.setInt32(at,v,true),
      byte:at=>this.storage[at],putByte:(at,v)=>this.storage[at]=v};
    this.bytes=this.storage.subarray(DATA,DATA+capacity);this.scratch=DATA+capacity;
    for(const [at,value] of [[WRAPPER,0x526544],[WRAPPER+4,BUFFER],[BUFFER,0x5266a0],[BUFFER+4,DATA],[BUFFER+8,capacity]])this.memory.put(at,value);
    this.clear();
  }
  get capacity(){return this.memory.get(BUFFER+8);}
  get writeOffset(){return this.memory.get(BUFFER+12);}
  set writeOffset(value){this.memory.put(BUFFER+12,value);}
  get readOffset(){return this.memory.get(BUFFER+16);}
  set readOffset(value){this.memory.put(BUFFER+16,value);}
  get head(){const pointer=this.memory.get(BUFFER+24);return pointer?pointer-DATA:null;}
  set head(value){this.memory.put(BUFFER+24,value===null?0:value+DATA);}
  get tail(){const pointer=this.memory.get(BUFFER+20);return pointer?pointer-DATA:null;}
  set tail(value){this.memory.put(BUFFER+20,value===null?0:value+DATA);}
  get count(){return nativeEventBufferCount(this.memory,BUFFER);}
  set count(value){this.memory.put(BUFFER+28,value);}
  clear(){nativeResetEventBuffer(this.memory,BUFFER);}
  allocate(size){const pointer=nativeAllocateEventRecord(this.memory,BUFFER,size);return pointer?pointer-DATA:null;}
  push(bytes) {
    const offset=this.allocate(bytes.length);if(offset===null)return null;
    this.bytes.set(bytes,offset);return offset;
  }
  peek() {
    const pointer=nativePeekEventRecord(this.memory,BUFFER,this.scratch+4);
    if(!pointer)return null;
    return {offset:pointer-DATA,bytes:this.storage.slice(pointer,pointer+this.memory.get(this.scratch+4))};
  }
  pop(){return nativeConsumeEventRecord(this.memory,BUFFER);}
  contains(offset){return nativeContainsEventRecord(this.memory,BUFFER,offset+DATA);}
  percentUsed(){return nativeEventBufferUsage(this.memory,BUFFER);}
  copyFrom(source){return nativeCopyEventBuffer(this.memory,BUFFER,BUFFER,source.memory);}
  writeEvent(event,payload){return nativeAppendSceneEvent(this.memory,WRAPPER,event,payload);}
  readEvent() {
    if(!nativeReadSceneEvent(this.memory,WRAPPER,this.scratch,this.scratch+4,this.scratch+8,true))return null;
    return {event:this.memory.get(this.scratch),payload:[...this.storage.slice(this.scratch+8,this.scratch+8+this.memory.get(this.scratch+4))]};
  }
  snapshot() {
    const records=[];
    for(let pointer=this.memory.get(BUFFER+24);pointer;pointer=this.memory.get(pointer+4))
      records.push({offset:pointer-DATA,payload:[...this.storage.slice(pointer+8,pointer+8+this.memory.get(pointer))]});
    return {writeOffset:this.writeOffset,readOffset:this.readOffset,head:this.head,tail:this.tail,
      count:this.count,percent:this.percentUsed(),records};
  }
}
