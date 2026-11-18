import {nativeCirclePixels} from './crater-mask.js';
//00492F10. The original uses half-pixel radii and truncates each row's square
//root before issuing four symmetric writes, retaining duplicate center writes.
//00492B10 /0048B780 supply clipped1-bit/8-bit pixel writes.
export function nativeFillBitmapCircle(memory,bitmap,cx,cy,radius,value,host={}) {
  cx|=0;cy|=0;radius|=0;value|=0;
  const write=host.putPixel??((x,y)=>{
    const get=o=>memory.get(bitmap+o)|0;
    if(x<get(28)||x>=get(36)||y<get(32)||y>=get(40))return;
    const row=(memory.get(bitmap+8)+Math.imul(y,get(16)))>>>0;
    if(get(12)===1) {
      const at=(row+(x>>3))>>>0,mask=1<<(x&7),old=memory.byte(at);
      memory.putByte(at,value?old|mask:old&~mask);
    } else memory.putByte((row+x)>>>0,value&255);
  });
  nativeCirclePixels(radius,(dx,dy,v)=>write((cx+dx)|0,(cy+dy)|0,v),value);
  return 1;
}
