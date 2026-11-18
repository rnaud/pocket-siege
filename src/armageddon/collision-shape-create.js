import {nativeCreatePanelImage} from './panel-resources.js';
import {nativeBitmapPixel,nativePutBitmapPixel} from './bitmap-pixel.js';

//004CBE20: an owned collision shape contains32 shifted one-bit bitmaps.
//Unlike004CBFC0's borrowed terrain bitmap, these planes are allocated here.
export function nativeCreateCollisionShape(memory,shape,region,source,host) {
  const [left,top,right,bottom,x,y]=region;
  memory.put(shape,0x527500);memory.put(shape,0x526920);
  memory.put(shape+20,(x-left)|0);memory.put(shape+4,1);memory.put(shape+8,0);
  memory.put(shape+24,(y-top)|0);
  memory.put(shape+12,(right-left)|0);memory.put(shape+16,(bottom-top)|0);
  for(let shift=0;shift<32;shift++) {
    const bitmap=host.allocate(44);
    if(bitmap) {
      nativeCreatePanelImage(memory,bitmap,(memory.get(shape+12)+shift)|0,memory.get(shape+16),1,host);
      memory.put(bitmap,0x526328);
    }
    memory.put(shape+28+shift*4,bitmap);
    for(let row=0;row<(memory.get(shape+16)|0);row++)
      for(let column=0;column<(memory.get(shape+12)|0);column++) {
        const solid=nativeBitmapPixel(memory,source,(left+column)|0,(top+row)|0)!==0;
        nativePutBitmapPixel(memory,memory.get(shape+28+shift*4),column+shift,row,Number(solid));
      }
  }
  return shape;
}
