import {nativeBitmapPixel8,nativeDestroyBitmap8} from './bitmap-storage.js';

//004A5B30..004A5C30, including004CBB70/004CBB50 resource-group dispatch.
export function nativeLoadSceneThemeResources(memory,owner,host) {
  const terrain=memory.get(owner+0x2b0),water=memory.get(terrain+0xb24),land=memory.get(terrain+0xb20);
  host.allocateArray(0,0x54a150);
  host.loadResourceGroup(owner,2,2,water,0x56fb80,0x566e78);
  host.loadResourceGroup(owner,1,1,memory.get(owner+0x2ac),0x56fb80,0x564a78);
  host.allocateArray(0,0x54a150);
  const scene=memory.get(owner+0x5cd0);
  const palette=host.getRendererPalette(memory.get(scene+8),3);
  const gradient=host.loadNamedArchiveImage(palette,land,'gradient.img');
  memory.put(scene+0x28,gradient);
  host.loadRendererSprite(memory.get(owner+0x2b4),3,3,2,land,'back.spr',0x600000);
  host.loadRendererSprite(memory.get(owner+0x2b4),3,1,3,land,'debris.spr',0x400000);
  host.loadRendererSprite(memory.get(owner+0x2b4),2,2,1,water,'layer\\layer.spr',0x600000);
  const waterPalette=host.getRendererPalette(memory.get(memory.get(owner+0x5cd0)+8),2);
  const fill=host.loadNamedArchiveImage(waterPalette,water,'fill.img');
  const color=nativeBitmapPixel8(memory,fill,0,0);
  memory.put(memory.get(owner+0x5cd0)+0x1245c,color);
  if(fill)nativeDestroyBitmap8(memory,fill,1,host);
}
