import {nativeBitmapPixel8,nativeDestroyBitmap8} from './bitmap-storage.js';
import {nativeLoadNamedArchiveImage} from './terrain-image.js';
import {nativeCreatePanelImage} from './panel-resources.js';
import {nativeLoadTerrainFile} from './terrain-file.js';
import {nativeFillBitmapRect} from './bitmap-rectangle.js';
import {nativeCreateFileArchive,nativeOpenFileArchive,nativeFileArchiveServices} from './archive-file.js';

//004A78A0..004A79C2: terrain constructor through image loading, waterline
//clearing and palette submission. Theme archives and later setup follow this.
export function nativeLoadTerrainLayers(memory,terrain,settings,scratch,host) {
  const {renderer,mode,path,count,positions,metadata,water}=settings;
  memory.put(terrain,0x526588);memory.put(terrain+0x8f8,mode);
  memory.put(terrain+0x8f4,renderer);
  memory.put(terrain+0xc8,host.getRendererPalette(renderer,3));
  nativeLoadTerrainFile(memory,path,memory.get(terrain+0xc8),{
    values:[metadata,water,count],positions,
    images:[terrain+0x8fc,terrain+0x908,terrain+0x904],
    names:[terrain+0x910,terrain+0xa10],
  },scratch,host);
  const top=Math.trunc(Math.imul((100-memory.get(water))|0,696)/100)|0;
  for(const offset of [0x8fc,0x908,0x904]) {
    if(host.clearBitmapRect)host.clearBitmapRect(memory.get(terrain+offset),0,top,1920,696,0);
    else nativeFillBitmapRect(memory,memory.get(terrain+offset),0,top,1920,696,0);
  }
  host.submitRendererPalette(renderer,3);
}

//004A79C2..004A7A67. Theme names are the byte strings from the terrain file.
//Archive directory parsing remains a service; original open results are ignored.
export function nativeLoadTerrainThemes(memory,terrain,metadata,host) {
  memory.put(terrain+0x8e4,memory.get(metadata));
  for(const [name,slot,suffix] of [[0x910,0xb20,'Level.dir'],[0xa10,0xb24,'Water.dir']]) {
    let path='';
    for(let i=0;memory.byte(terrain+name+i);i++)path+=String.fromCharCode(memory.byte(terrain+name+i));
    path+='\\'+suffix;
    const archive=host.allocate(0x19c);
    memory.put(terrain+slot,archive?nativeCreateFileArchive(memory,archive):0);
    nativeOpenFileArchive(memory,memory.get(terrain+slot),path,host);
  }
}

//004A7A67..004A7AC2. Original soil resource and1920x696 one-bit work mask.
//The memory adapter exposes the original constant string at0055F7E0.
export function nativeLoadTerrainSoil(memory,terrain,scratch,host) {
  const archive=memory.get(terrain+0xb20);
  const palette=host.getRendererPalette(memory.get(terrain+0x8f4),3);
  const soil=nativeLoadNamedArchiveImage(memory,palette,archive,0x55f7e0,scratch,nativeFileArchiveServices(memory,host));
  memory.put(terrain+0x900,soil);
  const mask=host.allocate(44);
  if(mask){nativeCreatePanelImage(memory,mask,1920,696,1,host);memory.put(mask,0x526328);}
  memory.put(terrain+0x90c,mask);
}

//004A7AC2..004A7AFC. Sample the grass image's marker color, then release the
//temporary image. Memory exposes the original grass.img constant at0055F7D4.
export function nativeLoadTerrainGrass(memory,terrain,scratch,host) {
  const archive=memory.get(terrain+0xb20);
  const palette=host.getRendererPalette(memory.get(terrain+0x8f4),3);
  const grass=nativeLoadNamedArchiveImage(memory,palette,archive,0x55f7d4,scratch,nativeFileArchiveServices(memory,host));
  memory.put(terrain+0x8e8,nativeBitmapPixel8(memory,grass,128,0));
  if(grass)nativeDestroyBitmap8(memory,grass,1,host);
}
