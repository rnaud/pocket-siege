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
