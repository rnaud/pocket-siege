import {nativeSelectSpriteFrame,nativePrepareSpriteBitmap} from './sprite-bitmap.js';
import {nativeDrawRendererStreamedSprite} from './streamed-sprite-draw.js';
import {nativeBitmapStorage} from './bitmap-storage.js';
import {nativeBlitIndexedBitmap} from './indexed-bitmap-blit.js';
import {nativeLockRendererBitmap} from './renderer-bitmap-draw.js';
import {nativeBuildRendererBlendTable} from './renderer-blend.js';

//00498890. Standard sprites take priority over streamed slots. Compose native
//frame/cache preparation, optional palette tint, camera anchors, target locking,
//blend drawing and horizontal tiling. Backend surface services remain explicit.
export function nativeDrawRendererSprite(memory,renderer,x,y,encoded,progress,scratch,host) {
  const id=encoded&0xffff;if(!id)return;
  const slot=renderer+0x2864+id*4,sprite=memory.get(slot);
  if(!sprite){nativeDrawRendererStreamedSprite(memory,renderer,x,y,encoded,progress,scratch,host);return;}
  const outputs=Array.from({length:6},(_,i)=>scratch+i*4);
  if(!nativeSelectSpriteFrame(memory,sprite,progress,outputs))return;
  const width=memory.get(outputs[0])|0,height=memory.get(outputs[1])|0;
  if(width<=0||height<=0)return;
  let source=nativePrepareSpriteBitmap(memory,memory.get(slot),host);if(!source)return;
  if(encoded&0x4000000) {
    nativeBlitIndexedBitmap(memory,memory.get(renderer+0x460),0,0,width,height,source,0,0,0,0);
    const storage=nativeBitmapStorage(memory,memory.get(renderer+0x460));
    const mapping=renderer+0x4b2c+(memory.get(renderer+0x30)<<8),saved=memory.byte(mapping);
    memory.putByte(mapping,0);
    const rowBytes=((width+3)>>2)*4;
    for(let row=0;row<height;row++)for(let col=0;col<rowBytes;col++) {
      const pixel=storage.pixels+Math.imul(row,storage.pitch)+col;
      memory.putByte(pixel,memory.byte(mapping+memory.byte(pixel)));
    }
    memory.putByte(renderer+0x4b2c+(memory.get(renderer+0x30)<<8),saved);
    source=memory.get(renderer+0x460);
  }
  const flipped=!!(encoded&0x40000),flags=flipped?0x10001:1;
  const anchorX=memory.get(outputs[2])|0,anchorY=memory.get(outputs[3])|0;
  let left=((memory.get(renderer+36)|0)+(x>>16)+(flipped?-width+anchorX:-anchorX))|0;
  const top=((memory.get(renderer+40)|0)+(y>>16)-anchorY)|0;
  const sx=memory.get(outputs[4]),sy=memory.get(outputs[5]);
  nativeLockRendererBitmap(memory,renderer,host);
  if(encoded&0x1000000) {
    nativeBuildRendererBlendTable(memory,renderer);
    nativeBlitIndexedBitmap(memory,memory.get(renderer+0x458),left,top,width,height,source,sx,sy,renderer+0x4b2c,flags);
    return;
  }
  const draw=()=>nativeBlitIndexedBitmap(memory,memory.get(renderer+0x458),left,top,width,height,source,sx,sy,0,flags);
  if(!(encoded&0x10000)){draw();return;}
  const start=memory.get(renderer+20)|0;
  while(left<start)left=(left+width)|0;
  while(left>start)left=(left-width)|0;
  while(left<(memory.get(renderer+28)|0)){draw();left=(left+width)|0;}
}
