//0049C650/004AF2F0: event wrapper owns a linked ring-buffer manager.
export function nativeCreateEventBufferMemory(memory,address,capacity,host) {
  memory.put(address,0x526544);const buffer=host.allocate(32);
  if(buffer) {
    memory.put(buffer,0x5266a0);memory.put(buffer+8,capacity);
    memory.put(buffer+4,host.allocateArray(capacity,0x5602dc));
    for(const offset of [28,24,20,16,12])memory.put(buffer+offset,0);
  }
  memory.put(address+4,buffer);return address;
}
//0049CB91..0049CCB2; renderer+4 is queried independently for each pair.
export function nativeCreateInitialSceneBuffers(memory,owner,scene,host) {
  for(const offset of [0x1b8dc,0x1b8e4]) {
    const [width,height]=host.rendererDimensions(memory.get(scene+8));
    memory.put(scene+offset,width);memory.put(scene+offset+4,height);
  }
  const stream=host.allocate(24);
  if(stream) {
    memory.put(stream,0x5268ac);memory.put(stream+16,0);memory.put(stream+12,0);
    memory.put(stream+8,0x16800);memory.put(stream+20,scene);
    memory.put(stream+4,host.allocateArray(0x16800,0x561fcc));
  }
  memory.put(owner+8,stream);
  for(const [offset,capacity] of [[0x28,0x2000],[0x2c,0x2000],[0x30,0x10000],[0x34,0x10000],[0x38,0x1000]]) {
    const wrapper=host.allocate(8);
    memory.put(owner+offset,wrapper?nativeCreateEventBufferMemory(memory,wrapper,capacity,host):0);
  }
}
//004C7310/0049C690/004AF330, in owner teardown order after root destruction.
export function nativeDestroyInitialSceneBuffers(memory,owner,flags,host) {
  const stream=memory.get(owner+8);
  if(stream){memory.put(stream,0x5268ac);host.free(memory.get(stream+4));memory.put(stream,0x524a14);if(flags&1)host.release(stream,24);}
  for(const offset of [0x28,0x2c,0x30,0x34,0x38]) {
    const wrapper=memory.get(owner+offset);if(!wrapper)continue;
    memory.put(wrapper,0x526544);const buffer=memory.get(wrapper+4);
    if(buffer){memory.put(buffer,0x5266a0);host.free(memory.get(buffer+4));memory.put(buffer,0x524a14);host.release(buffer,32);}
    memory.put(wrapper,0x524a14);if(flags&1)host.release(wrapper,8);
  }
}

//004AF470: aligned linked records in a circular allocation buffer.
export function nativeAllocateEventRecord(memory,buffer,size) {
  const boundary=memory.get(buffer+16)|0,span=((size+11)&~3)>>>0;
  let cursor=memory.get(buffer+12)|0;
  if(cursor<boundary){if(boundary<=((cursor+span)|0))return 0;}
  else if((memory.get(buffer+8)|0)<=((cursor+span)|0)) {
    cursor=0;if(boundary<=(span|0))return 0;
  }
  const record=(memory.get(buffer+4)+cursor)>>>0;
  memory.put(record,size);memory.put(record+4,0);
  const tail=memory.get(buffer+20);if(tail)memory.put(tail+4,record);
  memory.put(buffer+20,record);if(!memory.get(buffer+24))memory.put(buffer+24,record);
  memory.put(buffer+12,cursor+span);memory.put(buffer+28,memory.get(buffer+28)+1);
  return record+8;
}
//0049C7F0: event code precedes the byte payload.
export function nativeAppendSceneEvent(memory,wrapper,event,payload) {
  const record=nativeAllocateEventRecord(memory,memory.get(wrapper+4),payload.length+4);
  if(!record)return 0;memory.put(record,event);
  for(let i=0;i<payload.length;i++)memory.putByte(record+4+i,payload[i]);return 1;
}

//004AF390/004AF3B0/004AF3C0: reset preserves allocation bytes and capacity.
export function nativeResetEventBuffer(memory,buffer) {
  for(const offset of [28,24,20,16,12])memory.put(buffer+offset,0);
}
export function nativeEventBufferCount(memory,buffer){return memory.get(buffer+28);}
export function nativeEventBufferUsage(memory,buffer) {
  const write=memory.get(buffer+12)|0,read=memory.get(buffer+16)|0,capacity=memory.get(buffer+8)|0;
  const used=write<read?((write-read+capacity)|0):((write-read)|0);
  return Math.trunc(Math.imul(used,100)/capacity)|0;
}
//004AF3F0: empty reads leave the size destination untouched.
export function nativePeekEventRecord(memory,buffer,sizeOut) {
  const head=memory.get(buffer+24);if(!head)return 0;
  memory.put(sizeOut,memory.get(head));return head+8;
}
//004AF410: draining the final record also resets both circular cursors.
export function nativeConsumeEventRecord(memory,buffer) {
  const head=memory.get(buffer+24);if(!head)return 0;
  const next=memory.get(head+4);memory.put(buffer+24,next);
  if(!next){memory.put(buffer+20,0);memory.put(buffer+16,0);memory.put(buffer+12,0);}
  else memory.put(buffer+16,next-memory.get(buffer+4));
  memory.put(buffer+28,memory.get(buffer+28)-1);return 1;
}
//004AF440 searches only active linked records, not stale backing bytes.
export function nativeContainsEventRecord(memory,buffer,payload) {
  for(let record=memory.get(buffer+24);record;record=memory.get(record+4))if(((record-payload)|0)===-8)return 1;
  return 0;
}
//004AF4F0: partial copies remain committed when the destination fills.
export function nativeCopyEventBuffer(memory,destination,source) {
  for(let record=memory.get(source+24);record;record=memory.get(record+4)) {
    const size=memory.get(record),target=nativeAllocateEventRecord(memory,destination,size);
    if(!target)return 0;
    for(let i=0;i<size;i++)memory.putByte(target+i,memory.byte(record+8+i));
  }
  return 1;
}
//0049C720/0049C780: oversized records update sizeOut but are not consumed.
export function nativeReadSceneEvent(memory,wrapper,eventOut,sizeOut,payloadOut,consume=false) {
  const buffer=memory.get(wrapper+4),record=nativePeekEventRecord(memory,buffer,sizeOut);
  if(!record||(memory.get(sizeOut)|0)>0x128)return 0;
  const size=(memory.get(sizeOut)-4)>>>0;memory.put(sizeOut,size);
  for(let i=0;i<size;i++)memory.putByte(payloadOut+i,memory.byte(record+4+i));
  memory.put(eventOut,memory.get(record));
  if(consume)nativeConsumeEventRecord(memory,buffer);return 1;
}
