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
      byte:at=>this.storage[at],putByte:(at,v)=>this.storage[at]=v,range:(at,len)=>this.storage.subarray(at,at+len)};
    this.wrapper=WRAPPER;this.scratch=DATA+capacity;
    for(const [at,value] of [[WRAPPER,0x526544],[WRAPPER+4,BUFFER],[BUFFER,0x5266a0],[BUFFER+4,DATA],[BUFFER+8,capacity]])this.memory.put(at,value);
    this.clear();
  }
  //Borrow an already-constructed scene queue without resetting or reallocating it.
  //scratch is caller-owned space for an event code, size and292-byte payload.
  static fromMemory(memory,wrapper,scratch) {
    const queue=Object.create(NativeReplayBuffer.prototype);
    queue.memory=memory;queue.wrapper=wrapper;queue.scratch=scratch;return queue;
  }
  get buffer(){return this.memory.get(this.wrapper+4);}
  get data(){return this.memory.get(this.buffer+4);}
  get bytes(){return this.memory.range(this.data,this.capacity);}
  get capacity(){return this.memory.get(this.buffer+8);}
  get writeOffset(){return this.memory.get(this.buffer+12);}
  set writeOffset(value){this.memory.put(this.buffer+12,value);}
  get readOffset(){return this.memory.get(this.buffer+16);}
  set readOffset(value){this.memory.put(this.buffer+16,value);}
  get head(){const pointer=this.memory.get(this.buffer+24);return pointer?pointer-this.data:null;}
  set head(value){this.memory.put(this.buffer+24,value===null?0:value+this.data);}
  get tail(){const pointer=this.memory.get(this.buffer+20);return pointer?pointer-this.data:null;}
  set tail(value){this.memory.put(this.buffer+20,value===null?0:value+this.data);}
  get count(){return nativeEventBufferCount(this.memory,this.buffer);}
  set count(value){this.memory.put(this.buffer+28,value);}
  clear(){nativeResetEventBuffer(this.memory,this.buffer);}
  allocate(size){const pointer=nativeAllocateEventRecord(this.memory,this.buffer,size);return pointer?pointer-this.data:null;}
  push(bytes) {
    const offset=this.allocate(bytes.length);if(offset===null)return null;
    this.bytes.set(bytes,offset);return offset;
  }
  peek() {
    const pointer=nativePeekEventRecord(this.memory,this.buffer,this.scratch+4);
    if(!pointer)return null;
    return {offset:pointer-this.data,bytes:this.memory.range(pointer,this.memory.get(this.scratch+4)).slice()};
  }
  pop(){return nativeConsumeEventRecord(this.memory,this.buffer);}
  contains(offset){return nativeContainsEventRecord(this.memory,this.buffer,offset+this.data);}
  percentUsed(){return nativeEventBufferUsage(this.memory,this.buffer);}
  copyFrom(source){return nativeCopyEventBuffer(this.memory,this.buffer,source.buffer,source.memory);}
  writeEvent(event,payload){return nativeAppendSceneEvent(this.memory,this.wrapper,event,payload);}
  readEvent() {
    if(!nativeReadSceneEvent(this.memory,this.wrapper,this.scratch,this.scratch+4,this.scratch+8,true))return null;
    return {event:this.memory.get(this.scratch),payload:[...this.memory.range(this.scratch+8,this.memory.get(this.scratch+4))]};
  }
  snapshot() {
    const records=[];
    for(let pointer=this.memory.get(this.buffer+24);pointer;pointer=this.memory.get(pointer+4))
      records.push({offset:pointer-this.data,payload:[...this.memory.range(pointer+8,this.memory.get(pointer))]});
    return {writeOffset:this.writeOffset,readOffset:this.readOffset,head:this.head,tail:this.tail,
      count:this.count,percent:this.percentUsed(),records};
  }
}
