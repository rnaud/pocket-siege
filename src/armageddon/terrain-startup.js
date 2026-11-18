import {nativeLoadTerrainFile} from './terrain-file.js';

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
  for(const offset of [0x8fc,0x908,0x904])
    host.clearBitmapRect(memory.get(terrain+offset),0,top,1920,696,0);
  host.submitRendererPalette(renderer,3);
}
