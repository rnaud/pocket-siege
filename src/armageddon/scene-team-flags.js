import {nativeCreatePanelImage} from './panel-resources.js';
import {nativeFillBitmapRect} from './bitmap-rectangle.js';
import {nativePutBitmapPixel} from './bitmap-pixel.js';
import {nativeFindClosestGamePaletteColor} from './game-palette-memory.js';

//004A64F0: convert saved20x17 team flags into the shared game palette.
export function nativeCreateSceneTeamFlags(memory,owner,host) {
  const palette=host.getRendererPalette(memory.get(memory.get(owner+0x5cd0)+8),1);
  for(let team=0;team<memory.byte(memory.get(owner+0x5cd0)+0x4886);team++) {
    const colors=Uint8Array.from({length:768},(_,i)=>memory.byte(memory.get(owner+0x5cd0)+0x4ea4+team*3000+i));
    const pixels=Uint8Array.from({length:340},(_,i)=>memory.byte(memory.get(owner+0x5cd0)+0x51a4+team*3000+i));
    const bitmap=host.allocate(44);
    if(bitmap){nativeCreatePanelImage(memory,bitmap,20,17,8,host);memory.put(bitmap,0x5249b0);}
    memory.put(memory.get(owner+0x5cd0)+0x35c+team*4,bitmap);
    const scene=memory.get(owner+0x5cd0);
    nativeFillBitmapRect(memory,memory.get(scene+0x35c+team*4),0,0,20,17,memory.get(scene+0x12454));
    for(let y=1;y<16;y++)for(let x=1;x<19;x++) {
      const at=pixels[y*20+x]*3;
      const target=memory.get(memory.get(owner+0x5cd0)+0x35c+team*4);
      const index=nativeFindClosestGamePaletteColor(memory,palette,[colors[at],colors[at+1],colors[at+2]]);
      nativePutBitmapPixel(memory,target,x,y,index);
    }
  }
}
