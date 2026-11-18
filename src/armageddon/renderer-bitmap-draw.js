import {nativeRebindSpriteBitmap} from './sprite-bitmap.js';
import {nativeBuildRendererBlendTable} from './renderer-blend.js';
import {nativeBlitIndexedBitmap} from './indexed-bitmap-blit.js';

//00492E70. Preserve the independent bounds clamps, even for empty clips.
export function nativeSetBitmapClip(memory,bitmap,left,top,right,bottom) {
  for(const [offset,value] of [[28,left],[32,top],[36,right],[40,bottom]])memory.put(bitmap+offset,value);
  if((left|0)<0)memory.put(bitmap+28,0);
  if((top|0)<0)memory.put(bitmap+32,0);
  if((memory.get(bitmap+20)|0)<(right|0))memory.put(bitmap+36,memory.get(bitmap+20));
  if((memory.get(bitmap+24)|0)<(bottom|0))memory.put(bitmap+40,memory.get(bitmap+24));
}

//Shared target-lock sequence in004984E0/00498890. The surface captured after
//description remains the lock target across the second wait loop. Description
//dimensions/pitch, not the lock descriptor's, bind the borrowed target bitmap.
export function nativeLockRendererBitmap(memory,renderer,host) {
  if(memory.get(renderer+0x454))return;
  while(host.waitRenderer(renderer)){}
  const description=host.describeSurface(memory.get(renderer+0x48));
  const surface=memory.get(renderer+0x48);
  while(host.waitRenderer(renderer)){}
  const lock=host.lockSurface(surface,0,1,0);
  nativeRebindSpriteBitmap(memory,memory.get(renderer+0x458),description.width,description.height,lock.status?0:lock.pixels,description.pitch);
  nativeSetBitmapClip(memory,memory.get(renderer+0x458),...[20,24,28,32].map(offset=>memory.get(renderer+offset)));
  memory.put(renderer+0x454,1);
}

//004984E0. Original blended bitmap caller, including signed area rejection,
//target locking and dirty-table refresh before the indexed pixel operation.
export function nativeDrawRendererBlendedBitmap(memory,renderer,x,y,width,height,source,sx,sy,flags,host) {
  if((width|0)<=0||(height|0)<=0)return;
  nativeLockRendererBitmap(memory,renderer,host);
  nativeBuildRendererBlendTable(memory,renderer);
  nativeBlitIndexedBitmap(memory,memory.get(renderer+0x458),x,y,width,height,source,sx,sy,renderer+0x4b2c,flags);
}
