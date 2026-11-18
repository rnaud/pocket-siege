import {TOOL_CUT_REGIONS} from './terrain-cut-mask.js';
import {nativeCreatePanelImage} from './panel-resources.js';
import {nativeBitmapPixel,nativePutBitmapPixel} from './bitmap-pixel.js';

//004A7660: address-backed silhouette and square-dilated rim construction.
export function nativeCreateTerrainCutMask(memory,mask,region,source,host) {
  const [left,top,right,bottom,anchorX,anchorY]=region;
  memory.put(mask,0x526584);
  for(const [offset,value] of [[12,right-left+10],[16,bottom-top+10],[20,anchorX-left+5],[24,anchorY-top+5]])memory.put(mask+offset,value);
  for(const offset of [4,8]) {
    const bitmap=host.allocate(44);
    if(bitmap){nativeCreatePanelImage(memory,bitmap,memory.get(mask+12),memory.get(mask+16),1,host);memory.put(bitmap,0x526328);}
    memory.put(mask+offset,bitmap);
  }
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++) {
    const hole=memory.get(mask+4),value=nativeBitmapPixel(memory,source,x,y);
    nativePutBitmapPixel(memory,hole,x-left+5,y-top+5,value);
  }
  for(let y=0;y<(memory.get(mask+16)|0);y++)for(let x=0;x<(memory.get(mask+12)|0);x++) {
    if(!nativeBitmapPixel(memory,memory.get(mask+4),x,y))continue;
    for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++)nativePutBitmapPixel(memory,memory.get(mask+8),x+dx,y+dy,1);
  }
  return mask;
}

//004A7D50. Preserve allocation order and the original +2 mirror alignment.
export function nativeCreateTerrainToolMasks(memory,terrain,source,host) {
  const create=id=>{
    const mask=host.allocate(28);
    if(mask)nativeCreateTerrainCutMask(memory,mask,TOOL_CUT_REGIONS[id],source,host);
    memory.put(terrain+0x84+id*4,mask);
  };
  for(const id of [1,3,2,4,5,12,13,14,15,7,8,6])create(id);
  for(let y=0;y<32;y++)for(let x=0;x<96;x++)nativePutBitmapPixel(memory,source,354-x,y+32,nativeBitmapPixel(memory,source,256+x,y));
  for(const id of [10,11,9])create(id);
}
