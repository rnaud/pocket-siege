//00493130 clipping wrapper,0048B650 byte fill,004929E0 packed-bit fill and
//00492B10 unaligned bit writes. Packed bits are least-significant-bit first.
export function nativeFillBitmapRect(memory,bitmap,left,top,right,bottom,value) {
  const get=o=>memory.get(bitmap+o)|0;
  left|=0;top|=0;right|=0;bottom|=0;
  if(left>=right||top>=bottom||get(36)<=left||get(40)<=top||get(28)>=right||get(32)>=bottom)return 0;
  left=Math.max(left,get(28));top=Math.max(top,get(32));
  right=Math.min(right,get(36));bottom=Math.min(bottom,get(40));
  const bits=get(12),aligned=bits===1&&!(left&7)&&!(right&7);
  for(let y=top;y<bottom;y++) {
    const row=(memory.get(bitmap+8)+Math.imul(get(16),y))>>>0;
    if(bits===8||aligned) {
      const start=bits===8?left:left>>3,end=bits===8?right:right>>3;
      for(let x=start;x<end;x++)memory.putByte((row+x)>>>0,value&255);
    } else {
      for(let x=left;x<right;x++) {
        const address=(row+(x>>3))>>>0,mask=1<<(x&7),previous=memory.byte(address);
        memory.putByte(address,value?previous|mask:previous&~mask);
      }
    }
  }
  return 1;
}
