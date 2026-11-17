import { nativeValidateGirderTarget } from './target-placement.js';
import { nativeDrawCollisionRegistry } from './collision-registry.js';
import { nativePlacementBitmapBlit } from './placement-bitmap.js';

// 004CC2D0 draws the primary mask bitmap at anchor-adjusted pixel coordinates.
export function nativeDrawPlacementMask(mask,surface,x,y,mode) {
  return nativePlacementBitmapBlit(surface,(x-mask.anchorX)|0,(y-mask.anchorY)|0,
    mask.width,mask.height,mask.bitmap,0,0,mode);
}

// Compose00501700,004C9500,004CC2D0 and00493380/004933C0. Caller owns
// the native body registry and selected indexed sprite; lookup returns a body.
export function nativeGirderPlacement(memory,sceneMemory,x,y,sprite,registry,lookup,surface) {
  return nativeValidateGirderTarget(memory,sceneMemory,x,y,sprite,{
    dimensions:shape=>[shape.width,shape.height],
    lookup,position:body=>[body.x,body.y],
    clear:()=>surface.pixels.fill(0),
    draw:(dx,dy,excluded,flags,mode)=>nativeDrawCollisionRegistry(registry,surface,dx,dy,excluded,flags,mode,{
      bounds:mask=>[mask.width,mask.height,mask.anchorX,mask.anchorY],
      draw:nativeDrawPlacementMask,
    }),
    overlap:(...args)=>nativePlacementBitmapBlit(surface,...args),
  });
}
