//004AD270. Eight scratch bytes hold total size and directory offset. Virtual
//read/seek/view services retain original callback order and byte-count results.
export function nativeLoadArchiveDirectory(memory,archive,scratch,host) {
  for(const offset of [4,8,0x194])memory.put(archive+offset,0);
  for(let i=0;i<16;i++){memory.put(archive+12+i*16,0);memory.put(archive+0x10c+i*4,i);}
  memory.put(archive+0x18c,16);memory.put(archive+0x190,0);
  if(host.readArchive(archive,0x560230,4)!==4)return 0;
  if(memory.get(0x560230)!==0x1a524944)return 0;
  if(host.readArchive(archive,scratch,4)!==4)return 0;
  if(host.readArchive(archive,scratch+4,4)!==4)return 0;
  const view=host.archiveView(archive,(memory.get(scratch+4)+4)>>>0);
  memory.put(archive+4,view);
  if(!view) {
    host.seekArchive(archive,(memory.get(scratch+4)+4)>>>0);
    const size=()=>(memory.get(scratch)-memory.get(scratch+4)-4)>>>0;
    const directory=host.allocateArray(size(),0x560220);
    memory.put(archive+4,directory);
    if(!directory)return 0;
    const read=host.readArchive(archive,directory,size());
    if(((read-memory.get(scratch)+memory.get(scratch+4))|0)!==-4){host.free(memory.get(archive+4));return 0;}
    memory.put(archive+8,1);
  }
  for(let offset=0;offset<0x1000;offset+=4) {
    const base=memory.get(archive+4),relative=memory.get(base+offset);
    if(!relative)continue;
    memory.put(base+offset,(relative+base-4)>>>0);
    let node=memory.get(memory.get(archive+4)+offset);
    while(node) {
      const next=memory.get(node);
      if(next)memory.put(node,(memory.get(archive+4)+next-4)>>>0);
      node=memory.get(node);
    }
  }
  memory.put(archive+0x194,1);
  return 1;
}
