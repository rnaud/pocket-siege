//00492BC0. Native image header, signed stride rounding, zeroed pixel storage.
export function nativeCreatePanelImage(memory,address,width,height,bits,host) {
  memory.put(address,0x526390);memory.put(address+12,bits);
  memory.put(address+20,width);memory.put(address+24,height);
  const packed=(Math.imul(bits,width)+7)|0;
  const stride=(Math.trunc(packed/8)+3)&~3;
  memory.put(address+16,stride);
  const size=Math.imul(height,stride)>>>0,pixels=host.allocateArray(size,0x54a17c);
  memory.put(address+8,pixels);
  for(let offset=0;offset<size;offset++)memory.putByte(pixels+offset,0);
  for(const offset of [4,28,32])memory.put(address+offset,0);
  memory.put(address+36,width);memory.put(address+40,height);
  return address;
}

//004C6610. Text cache constructor, including the one-byte empty string write.
export function nativeCreatePanelText(memory,address,resources,font,width,host) {
  memory.put(address,0x5268a4);memory.put(address+20,resources);memory.put(address+4,width);
  const height=(host.fontHeight(resources,font,32)+1)|0;
  memory.put(address+8,height);
  const image=host.allocate(44);
  if(image) {
    nativeCreatePanelImage(memory,image,width,height,8,host);
    memory.put(image,0x5249b0);
  }
  memory.put(address+12,image);
  for(const offset of [16,0x124,0x120,0x11c,0x12c,0x128,24,0x134])memory.put(address+offset,0);
  memory.putByte(address+28,0);memory.put(address+0x130,-1);
  return address;
}

//004FD5A0. Worm panel bounds and its native image buffer.
export function nativeCreateWormPanel(memory,address,left,top,right,bottom,host) {
  memory.put(address,0x527690);
  for(const offset of [4,8,12,16])memory.put(address+offset,-1);
  for(const [offset,value] of [[20,left],[24,top],[28,right],[32,bottom],[36,right-left],[40,bottom-top],[44,0]])memory.put(address+offset,value);
  const image=host.allocate(44);
  if(image){nativeCreatePanelImage(memory,image,((right-left)|0)+2,((bottom-top)|0)+2,8,host);memory.put(image,0x5249b0);}
  memory.put(address+48,image);return address;
}
