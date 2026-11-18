import {nativeCreatePanelImage} from './panel-resources.js';
import {nativeFillBitmapCircle} from './bitmap-circle.js';

//004A8E50. Sixteen original hole/rim bitmap pairs and their work bitmap.
export function nativeCreateTerrainMasks(memory,terrain,host) {
  host.allocateArray(0,0x54a150);
  const create=(slot,width,height)=>{
    const bitmap=host.allocate(44);
    if(bitmap){nativeCreatePanelImage(memory,bitmap,width,height,1,host);memory.put(bitmap,0x526328);}
    memory.put(slot,bitmap);return bitmap;
  };
  let outer=0;
  for(let index=0;index<16;index++) {
    outer=Math.trunc(index*94/15)+11;
    const inner=outer-5,size=outer*2+1;
    const hole=create(terrain+4+index*4,size,size);
    nativeFillBitmapCircle(memory,hole,outer,outer,inner,1);
    const rim=create(terrain+0x44+index*4,size,size);
    nativeFillBitmapCircle(memory,rim,outer,outer,outer,1);
    nativeFillBitmapCircle(memory,rim,outer,outer,inner,0);
  }
  create(terrain+0xcc,outer*2+33,outer*2+1);
  host.allocateArray(0,0x54a150);
}
