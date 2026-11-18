//004AD780. Name normalization/hash, directory chains and sixteen open slots.
//The shared name buffer and pool writes are observable original state.
export function nativeOpenArchiveEntry(memory,archive,name,host) {
  if(!memory.get(archive+0x18c))return 0;
  const normalized=0x7d6058;
  let length=0;while(memory.byte(name+length))length++;length++;
  let offset=0;
  for(;offset+4<=length;offset+=4)memory.put(normalized+offset,memory.get(name+offset));
  for(;offset<length;offset++)memory.putByte(normalized+offset,memory.byte(name+offset));
  for(let i=0;memory.byte(normalized+i);i++) {
    const value=memory.byte(normalized+i);
    if(value>=65&&value<=90)memory.putByte(normalized+i,value+32);
  }
  let hash=0;
  for(let i=0;memory.byte(normalized+i);i++)hash=(memory.byte(normalized+i)+((hash>>>9)|((hash*2)&1023)))&1023;
  let entry=memory.get(memory.get(archive+4)+hash*4);
  while(entry) {
    let i=0;while(memory.byte(entry+12+i)===memory.byte(normalized+i)&&memory.byte(normalized+i))i++;
    if(memory.byte(entry+12+i)===memory.byte(normalized+i))break;
    entry=memory.get(entry);
  }
  if(!entry)return 0;
  const free=(memory.get(archive+0x18c)-1)>>>0;memory.put(archive+0x18c,free);
  const slot=memory.get(archive+0x10c+free*4),used=memory.get(archive+0x190);
  memory.put(archive+0x14c+used*4,slot);memory.put(archive+0x190,used+1);
  const handle=host.allocate(12),record=(archive+slot*16)>>>0;
  if(handle){memory.put(handle,0x5265d4);memory.put(handle+8,archive);memory.put(handle+4,slot);}
  memory.put(record+12,handle);
  memory.put(record+16,memory.get(entry+4));
  memory.put(record+20,(memory.get(entry+8)+memory.get(entry+4))>>>0);
  memory.put(record+24,memory.get(entry+4));
  return memory.get(record+12);
}
