import { nativeValidateGirderTarget } from './target-placement.js';
import { nativeDrawCollisionRegistry } from './collision-registry.js';
import { nativePlacementBitmapBlit } from './placement-bitmap.js';
import { NativeCollisionScene } from './collision-scene.js';
import schemes from './scheme-runtime.js';

//00415540 expands the scheme range at builder+d600; the runtime copy maps
// it to context+11d6c. Match the resource195 defaults used by live physics.
const defaults = schemes.schemes.find(scheme=>scheme.resource_id===195).bytes;
const rangeOffset = 0x11d6c-schemes.context_offset;
export const nativeDefaultGirderRange = defaults[rangeOffset] | defaults[rangeOffset+1]<<8;

export function nativeSceneGirderPlacement(terrain, worms, objects, width, height,
  worm, x, y, sprite, range = nativeDefaultGirderRange) {
  const scene = new NativeCollisionScene(terrain,height);
  scene.syncWorms(worms);
  scene.syncObjects(objects);
  const index = worms.indexOf(worm);
  if (index < 0 || !sprite) return 0;
  const memory = new Uint8Array(0x50), context = new Uint8Array(0x11d6e);
  new DataView(context.buffer).setUint16(0x11d6c,range,true);
  const surface = {width,height,pixels:new Uint8Array(width*height)};
  return nativeGirderPlacement(memory,context,x,y,sprite,scene.placementRegistry(width),
    ()=>scene.wormBodies[index],surface);
}

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
