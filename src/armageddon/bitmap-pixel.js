import {nativeBitmapPixel8} from './bitmap-storage.js';

//00492AC0 /0048B740. Both bitmap formats use signed clip bounds.
export function nativeBitmapPixel(memory,bitmap,x,y) {
  if(memory.get(bitmap+12)!==1)return nativeBitmapPixel8(memory,bitmap,x,y);
  x|=0;y|=0;const get=o=>memory.get(bitmap+o)|0;
  if(x<get(28)||x>=get(36)||y<get(32)||y>=get(40))return 0;
  const at=(memory.get(bitmap+8)+Math.imul(y,get(16))+(x>>3))>>>0;
  return (memory.byte(at)>>(x&7))&1;
}

//00492B10 /0048B780. Any nonzero1-bit value sets a bit;8-bit writes truncate.
export function nativePutBitmapPixel(memory,bitmap,x,y,value) {
  x|=0;y|=0;value|=0;const get=o=>memory.get(bitmap+o)|0;
  if(x<get(28)||x>=get(36)||y<get(32)||y>=get(40))return;
  const row=(memory.get(bitmap+8)+Math.imul(y,get(16)))>>>0;
  if(get(12)===1) {
    const at=(row+(x>>3))>>>0,mask=1<<(x&7),old=memory.byte(at);
    memory.putByte(at,value?old|mask:old&~mask);
  } else memory.putByte((row+x)>>>0,value&255);
}
