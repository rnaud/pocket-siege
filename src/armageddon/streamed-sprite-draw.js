import {nativeSpriteFrame} from './animation.js';
const word=(m,p)=>(m.byte(p)|(m.byte(p+1)<<8))<<16>>16;

//004B0260. Streamed sprites use signed canvas dimensions/counts and return
//the selected surface; unlike standard SPR selection they do not store a frame.
export function nativeSelectStreamedSpriteFrame(memory,sprite,progress,outputs) {
  const index=nativeSpriteFrame(word(memory,sprite+106),word(memory,sprite+104),progress),offset=Math.imul(index,12);
  const frame=()=>memory.get(sprite+112)+offset;
  memory.put(outputs[0],word(memory,frame()+4)-word(memory,frame()));
  memory.put(outputs[1],word(memory,frame()+6)-word(memory,frame()+2));
  memory.put(outputs[4],0);memory.put(outputs[5],0);
  memory.put(outputs[2],Math.trunc(word(memory,sprite+108)/2)-word(memory,frame()));
  memory.put(outputs[3],Math.trunc(word(memory,sprite+110)/2)-word(memory,frame()+2));
  return memory.get(frame()+8);
}

//004980E0. Clip a surface copy, unlock the current target if necessary, then
//re-read that target for the blit. Surface operations are backend interfaces.
export function nativeBlitRendererSurface(memory,renderer,x,y,width,height,source,sx,sy,flags,host) {
  x|=0;y|=0;width|=0;height|=0;
  const right=(x+width)|0,bottom=(y+height)|0;
  const clip=[20,24,28,32].map(offset=>memory.get(renderer+offset)|0);
  if(x>=clip[2]||right<=clip[0]||y>=clip[3]||bottom<=clip[1])return;
  const left=Math.max(x,clip[0]),top=Math.max(y,clip[1]),endX=Math.min(right,clip[2]),endY=Math.min(bottom,clip[3]);
  if(left===endX||top===endY)return;
  const startX=(sx+left-x)|0,startY=(sy+top-y)|0;
  const rect=[startX,startY,(startX+endX-left)|0,(startY+endY-top)|0];
  if(memory.get(renderer+0x454)) {
    host.unlockSurface(memory.get(renderer+0x48),0);
    memory.put(renderer+0x454,0);
  }
  host.blitSurface(memory.get(renderer+0x48),left,top,source,rect,(flags|16)>>>0);
}

//00498890 streamed-resource branch: camera translation, center anchors and
//horizontal tiling feed the original clipped surface-copy caller.
export function nativeDrawRendererStreamedSprite(memory,renderer,x,y,encoded,progress,scratch,host) {
  const id=encoded&0xffff;if(!id)return;
  const sprite=memory.get(renderer+0x38e4+id*4);if(!sprite)return;
  const outputs=Array.from({length:6},(_,i)=>scratch+i*4);
  const surface=nativeSelectStreamedSpriteFrame(memory,sprite,progress,outputs);if(!surface)return;
  const width=memory.get(outputs[0])|0,height=memory.get(outputs[1])|0;
  let left=((memory.get(renderer+36)|0)+(x>>16)-(memory.get(outputs[2])|0))|0;
  const top=((memory.get(renderer+40)|0)+(y>>16)-(memory.get(outputs[3])|0))|0;
  const sx=memory.get(outputs[4]),sy=memory.get(outputs[5]);
  const draw=()=>nativeBlitRendererSurface(memory,renderer,left,top,width,height,surface,sx,sy,1,host);
  if(!(encoded&0x10000)){draw();return;}
  const start=memory.get(renderer+20)|0;
  while(left<start)left=(left+width)|0;
  while(left>start)left=(left-width)|0;
  while(left<(memory.get(renderer+28)|0)){draw();left=(left+width)|0;}
}
