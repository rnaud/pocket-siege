import {nativeCreateFont,nativeLoadArchiveFont} from './archive-art.js';

//004B03B0: release only owned file data, then optionally the font object.
export function nativeDestroyFont(memory,font,flags,host) {
  memory.put(font,0x5266ac);
  const owned=memory.get(font+24);if(owned)host.freeArray(owned);
  memory.put(font,0x524a14);
  if(flags&1)host.freeSized(font,28);
  return font;
}

//00497CA0. Font IDs1..31 share renderer palette banks1..7. Failed loads
//destroy the newly constructed font without registering it or changing counts.
export function nativeLoadRendererFont(memory,renderer,bank,priority,id,archive,name,mapping,host) {
  bank|=0;priority|=0;id|=0;
  if(priority<1||bank<1||bank>7||!memory.get(renderer+0x4ae4+bank*4))return 0;
  if(id<1||id>=32||memory.get(renderer+0x49e4+id*4))return 0;
  const font=host.allocate(28);
  if(font)nativeCreateFont(memory,font);
  if(!nativeLoadArchiveFont(memory,font,memory.get(renderer+0x4ae4+bank*4),archive,name,mapping,host)) {
    if(font)nativeDestroyFont(memory,font,1,host);
    return 0;
  }
  memory.put(renderer+0x49e4+id*4,font);
  memory.put(renderer+0x48e4+id*4,bank);memory.put(renderer+0x4964+id*4,priority);
  const count=renderer+0x4b04+memory.get(renderer+0x48e4+id*4)*4;
  memory.put(count,memory.get(count)+1);
  return 1;
}
