import {nativePutBitmapPixel} from './bitmap-pixel.js';
import {nativeCirclePixels} from './crater-mask.js';
//00492F10. The original uses half-pixel radii and truncates each row's square
//root before issuing four symmetric writes, retaining duplicate center writes.
//00492B10 /0048B780 supply clipped1-bit/8-bit pixel writes.
export function nativeFillBitmapCircle(memory,bitmap,cx,cy,radius,value,host={}) {
  cx|=0;cy|=0;radius|=0;value|=0;
  const write=host.putPixel??((x,y,v)=>nativePutBitmapPixel(memory,bitmap,x,y,v));
  nativeCirclePixels(radius,(dx,dy,v)=>write((cx+dx)|0,(cy+dy)|0,v),value);
  return 1;
}
