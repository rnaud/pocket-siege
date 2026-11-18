import {nativeCreatePanelImage} from './panel-resources.js';
import {nativePutBitmapPixel} from './bitmap-pixel.js';
import {nativeFindClosestGamePaletteColor,nativeReadGamePaletteColor} from './game-palette-memory.js';

//004A6210: custom graves retain transparent index0 and get dry/water images.
//waterColor is caller-owned signed RGB scratch; failed palette reads retain it.
export function nativeCreateSceneTeamGraves(memory,owner,waterColor,host) {
  const dry=host.getRendererPalette(memory.get(memory.get(owner+0x5cd0)+8),1);
  const wet=host.getRendererPalette(memory.get(memory.get(owner+0x5cd0)+8),2);
  nativeReadGamePaletteColor(memory,wet,memory.get(memory.get(owner+0x5cd0)+0x1245c),waterColor);
  for(let team=0;team<memory.byte(memory.get(owner+0x5cd0)+0x4886);team++) {
    const record=memory.get(owner+0x5cd0)+team*3000;
    if(memory.get(record+0x48a0))continue;
    const colors=Uint8Array.from({length:768},(_,i)=>memory.byte(record+0x48a4+i));
    const pixels=Uint8Array.from({length:768},(_,i)=>memory.byte(memory.get(owner+0x5cd0)+team*3000+0x4ba4+i));
    for(const slot of [0x374,0x378]) {
      const bitmap=host.allocate(44);
      if(bitmap){nativeCreatePanelImage(memory,bitmap,24,32,8,host);memory.put(bitmap,0x5249b0);}
      memory.put(memory.get(owner+0x5cd0)+slot+team*8,bitmap);
    }
    for(let y=0;y<32;y++)for(let x=0;x<24;x++) {
      const pixel=pixels[y*24+x];if(!pixel)continue;
      const rgb=[colors[pixel*3],colors[pixel*3+1],colors[pixel*3+2]];
      const dryBitmap=memory.get(memory.get(owner+0x5cd0)+0x374+team*8);
      nativePutBitmapPixel(memory,dryBitmap,x,y,nativeFindClosestGamePaletteColor(memory,dry,rgb));
      const mixed=rgb.map((v,c)=>Math.trunc((v+waterColor[c])/2));
      const wetBitmap=memory.get(memory.get(owner+0x5cd0)+0x378+team*8);
      nativePutBitmapPixel(memory,wetBitmap,x,y,nativeFindClosestGamePaletteColor(memory,wet,mixed));
    }
  }
}
