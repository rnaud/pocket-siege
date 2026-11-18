import {nativeLoadTerrainImage} from './terrain-image.js';
//004CC500. The serialized terrain wrapper ignores header contents and read
//results. Its default image loader composes004F08E0 and004AB3C9. scratch is a
//caller-owned20-byte temporary, followed by the image loader's0x428-byte frame.
export function nativeLoadTerrainFile(memory,path,palette,outputs,scratch,host) {
  const file=host.openFile(path,'rb');
  if(!file)return 0;
  for(let i=0;i<4;i++)host.readFile(scratch+i*4,4,1,file);
  for(const address of outputs.values)host.readFile(address,4,1,file);
  host.readFile(outputs.positions,(memory.get(outputs.values[2])<<3)>>>0,1,file);
  for(let i=2;i>=0;i--) {
    const image=host.loadTerrainImage?host.loadTerrainImage(palette,file)
      :nativeLoadTerrainImage(memory,palette,file,scratch+20,host);
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
