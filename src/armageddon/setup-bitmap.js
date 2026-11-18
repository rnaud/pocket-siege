//0040F210. Windows bitmap acquisition and the palette backend are host services.
//Preserve the original AND dimension guard, row orientation, stride-sized
//copies (including padding), destination pitch and palette/cleanup ordering.
export function nativeLoadSetupBitmap(memory,path,pixels,palette,width,height,host) {
  const handle=host.loadImage(0,path,0,0,0,0x2010);
  if(!handle)return 0;
  const bitmap=host.getBitmap(handle,0x54);
  if(bitmap.width!==width&&bitmap.height!==height){host.deleteImage(handle);return 0;}
  let rows=bitmap.height|0,source=bitmap.bits>>>0,pitch=bitmap.stride|0;
  const stride=bitmap.stride>>>0;
  if(rows<0)rows=(-rows)|0;
  else {source=(source+Math.imul(rows-1,pitch))>>>0;pitch=-pitch;}
  for(let row=0;row<rows;row++) {
    //REP MOVSD followed by REP MOVSB: retain forward/overlap semantics.
    let i=0;
    for(;i+4<=stride;i+=4)memory.put((pixels+i)>>>0,memory.get((source+i)>>>0));
    for(;i<stride;i++)memory.putByte((pixels+i)>>>0,memory.byte((source+i)>>>0));
    source=(source+pitch)>>>0;pixels=(pixels+width)>>>0;
  }
  const reader=host.openPalette(path);
  host.readPalette(reader,palette,0,256);
  host.closePalette(reader);
  host.deleteImage(handle);
  return 1;
}
