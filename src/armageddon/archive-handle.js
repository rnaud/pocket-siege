function recordFor(memory,archive,slot) {
  slot|=0;
  return slot>=0&&slot<16&&memory.get(archive+slot*16+12)?archive+slot*16:0;
}
//004ACB80. Relative cursor; an invalid/unowned handle reports zero.
export function nativeTellArchiveEntry(memory,handle) {
  const archive=memory.get(handle+8);if(!archive)return 0;
  const record=recordFor(memory,archive,memory.get(handle+4));
  return record?(memory.get(record+24)-memory.get(record+16))|0:0;
}
//004ACC70 +004ADA20. Seek even for a zero-byte request. Advance the current
//record cursor only after a complete read, re-reading it after callbacks.
export function nativeReadArchiveEntry(memory,handle,destination,size,host) {
  const archive=memory.get(handle+8);if(!archive)return 0;
  const record=recordFor(memory,archive,memory.get(handle+4));if(!record)return 0;
  const position=memory.get(record+24)|0,end=memory.get(record+20)|0;
  const count=(Math.min((size+position)|0,end)-position)|0;
  if(!host.seekArchive(archive,position)||!count)return 0;
  if(host.readArchive(archive,destination,count)!==count)return 0;
  memory.put(record+24,(memory.get(record+24)+count)|0);
  return count;
}
//004AC9B0 scalar deleting destructor. Remove by replacing with the last used
//slot; release the slot before optional heap deletion of the handle object.
export function nativeDestroyArchiveEntry(memory,handle,flags,host) {
  memory.put(handle,0x5265d4);
  const archive=memory.get(handle+8),slot=memory.get(handle+4)|0;
  const record=recordFor(memory,archive,slot);
  if(record) {
    const count=memory.get(archive+0x190)|0;
    for(let i=0;i<count;i++)if((memory.get(archive+0x14c+i*4)|0)===slot) {
      memory.put(archive+0x190,count-1);
      memory.put(archive+0x14c+i*4,memory.get(archive+0x14c+(count-1)*4));
      const free=memory.get(archive+0x18c);
      memory.put(archive+0x10c+free*4,slot);memory.put(archive+0x18c,free+1);
      memory.put(record+12,0);break;
    }
  }
  memory.put(handle,0x524a14);
  if(flags&1)host.freeSized(handle,12);
  return handle;
}
