import {nativeCreateSprite,nativeLoadArchiveSprite} from './archive-art.js';
import {nativeDestroyBitmap8} from './bitmap-storage.js';

//004AF600/004AF630. Release the borrowed bitmap wrapper, owned source, then
//cached compressed blocks in descriptor order. Callbacks may mutate pointers.
export function nativeDestroySprite(memory,sprite,flags,host) {
  memory.put(sprite,0x5266a4);
  const bitmap=memory.get(sprite+32);if(bitmap)nativeDestroyBitmap8(memory,bitmap,1,host);
  const owned=memory.get(sprite+48);if(owned)host.freeArray(owned);
  const count=()=>memory.byte(sprite+28)|(memory.byte(sprite+29)<<8);
  if(memory.get(sprite+24)&&count())for(let i=0;i<count();i++) {
    const block=memory.get(memory.get(sprite+24)+i*12+4);
    if(block)host.releaseSpriteBlock(memory.get(sprite+68),block);
  }
  memory.put(sprite,0x524a14);
  if(flags&1)host.freeSized(sprite,72);
  return sprite;
}

//00497990. Standard SPR resources own their parser/archive state. The alternate
//streamed format retains explicit construction/loading/destruction services.
export function nativeLoadRendererSprite(memory,renderer,bank,priority,id,archive,name,flags,host) {
  bank|=0;priority|=0;id|=0;
  if(priority<1||bank<1||bank>7||!memory.get(renderer+0x4ae4+bank*4))return 0;
  if(id<1||id>=1024||memory.get(renderer+0x2864+id*4)||memory.get(renderer+0x38e4+id*4))return 0;
  const streamed=!!(flags&0x200000),sprite=host.allocate(streamed?116:72);
  if(sprite) {
    if(streamed)host.createStreamedSprite(sprite,renderer);
    else nativeCreateSprite(memory,sprite,0x497b20,0x497ba0);
  }
  const palette=memory.get(renderer+0x4ae4+bank*4);
  const loaded=streamed?host.loadStreamedSprite(sprite,palette,archive,name):nativeLoadArchiveSprite(memory,sprite,palette,archive,name,host);
  if(!loaded) {
    if(sprite){if(streamed)host.destroyStreamedSprite(sprite,1);else nativeDestroySprite(memory,sprite,1,host);}
    return 0;
  }
  memory.put(renderer+(streamed?0x38e4:0x2864)+id*4,sprite);
  memory.put(renderer+0x864+id*4,bank);memory.put(renderer+0x1864+id*4,priority);
  const count=renderer+0x4b04+memory.get(renderer+0x864+id*4)*4;
  memory.put(count,memory.get(count)+1);
  return 1;
}
