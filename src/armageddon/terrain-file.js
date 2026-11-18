//004CC500. The serialized terrain wrapper ignores header contents and read
//results. Embedded IMG decoding remains a resource interface. scratch is a
//caller-owned20-byte temporary, separate from persistent terrain memory.
export function nativeLoadTerrainFile(memory,path,palette,outputs,scratch,host) {
  const file=host.openFile(path,'rb');
  if(!file)return 0;
  for(let i=0;i<4;i++)host.readFile(scratch+i*4,4,1,file);
  for(const address of outputs.values)host.readFile(address,4,1,file);
  host.readFile(outputs.positions,(memory.get(outputs.values[2])<<3)>>>0,1,file);
  for(let i=2;i>=0;i--) {
    const image=host.loadTerrainImage(palette,file);
    memory.put(outputs.images[i],image);
  }
  for(const name of outputs.names) {
    memory.put(scratch+16,0);
    host.readFile(scratch+16,1,1,file);
    host.readFile(name,memory.get(scratch+16),1,file);
    memory.putByte((name+memory.get(scratch+16))>>>0,0);
  }
  host.closeFile(file);
  return 1;
}
