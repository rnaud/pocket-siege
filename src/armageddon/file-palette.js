//DirectX2D.dll10002070. Retain original fixed-size BMP header/palette reading,
//internal BGR0 storage, RGB0 DirectDraw entries and failure ownership rules.
export function nativeLoadFilePalette(memory,slot,path,host) {
  const entries=new Uint8Array(1024);
  memory.put(slot,0);
  const file=host.openFile(path,'rb');
  if(!file)return 0x8100000c;
  const header=host.allocate(0x42c);
  host.seekFile(file,14,0);
  if(host.readFile(header,1,0x42c,file)!==0x42c){
    host.free(header);host.closeFile(file);return 0x8100000d;
  }
  host.closeFile(file);
  const bits=memory.byte(header+14)|(memory.byte(header+15)<<8);
  //The original returns success here without freeing the header or producing
  //a palette. Preserve this observed behavior rather than repairing it.
  if(bits>8)return 0;
  const count=1<<bits,palette=host.allocate(0x410);
  memory.put(slot,palette);memory.put(palette+0x400,count);
  for(let i=0;i<count;i++) {
    const source=header+40+i*4,dest=palette+i*4;
    const red=memory.byte(source+2),green=memory.byte(source+1),blue=memory.byte(source);
    entries.set([red,green,blue,0],i*4);
    memory.putByte(dest+2,red);memory.putByte(dest+1,green);
    memory.putByte(dest,blue);memory.putByte(dest+3,0);
  }
  host.free(header);
  if(host.createPalette(host.device(),0x44,entries,memory.get(slot)+0x404,0)!==0)
    return 0x8100000e;
  memory.put(memory.get(slot)+0x40c,1);
  return 0;
}

//DirectX2D.dll100022A0. The DirectDraw result is ignored by the original wrapper.
export function nativeGetFilePaletteEntries(memory,palette,dest,first,count,host) {
  if(!palette)return 0x8100003b;
  host.getPaletteEntries(memory.get(palette+0x404),0,first,count,dest);
  return 0;
}

//DirectX2D.dll10002250. Destroy decrements the shared reference count and clears
//the caller's slot only after the final resource/free path.
export function nativeDestroyFilePalette(memory,slot,host) {
  const palette=memory.get(slot);
  if(palette) {
    memory.put(palette+0x40c,(memory.get(palette+0x40c)-1)>>>0);
    if(memory.get(memory.get(slot)+0x40c)===0) {
      if(host.device())host.releasePalette(memory.get(memory.get(slot)+0x404));
      host.free(memory.get(slot));memory.put(slot,0);
    }
  }
  return 0;
}
