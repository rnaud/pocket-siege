import {nativeOpenArchiveEntry} from './archive-lookup.js';
import {nativeArchiveEntrySize,nativeReadArchiveEntry,nativeDestroyArchiveEntry} from './archive-handle.js';
import {nativeReadSprite} from './sprite-memory.js';
import {nativeReadFont} from './font-memory.js';

//004AF5C0 and004B0390. Constructors leave all unspecified bytes untouched.
export function nativeCreateSprite(memory,sprite,prepare,release) {
  memory.put(sprite,0x5266a4);memory.put(sprite+64,prepare);memory.put(sprite+68,release);
  for(const offset of [28,14]){memory.putByte(sprite+offset,0);memory.putByte(sprite+offset+1,0);}
  for(const offset of [36,48,32])memory.put(sprite+offset,0);
  memory.put(sprite+52,-1);return sprite;
}
export function nativeCreateFont(memory,font) {
  memory.put(font,0x5266ac);
  for(const offset of [4,8]){memory.putByte(font+offset,0);memory.putByte(font+offset+1,0);}
  memory.put(font+12,0);memory.put(font+24,0);return font;
}

//004AF6F0/004B0420. Mapped entries are borrowed; file entries are copied into
//owned storage before the entry is destroyed. The original ignores read count.
function sourceFor(memory,object,ownedOffset,pool,archive,name,host) {
  const mapped=host.lookupArchiveResource?.(archive,name)??0;
  if(mapped)return mapped;
  const handle=nativeOpenArchiveEntry(memory,archive,name,host);
  if(!handle)return null;
  const size=nativeArchiveEntrySize(memory,handle);
  memory.put(object+ownedOffset,host.allocateArray(size,pool));
  nativeReadArchiveEntry(memory,handle,memory.get(object+ownedOffset),size,host);
  nativeDestroyArchiveEntry(memory,handle,1,host);
  return memory.get(object+ownedOffset);
}
export function nativeLoadArchiveSprite(memory,sprite,palette,archive,name,host) {
  const source=sourceFor(memory,sprite,48,0x5602f4,archive,name,host);
  return source!==null?nativeReadSprite(memory,sprite,palette,source,host):0;
}
export function nativeLoadArchiveFont(memory,font,palette,archive,name,mapping,host) {
  const source=sourceFor(memory,font,24,0x560344,archive,name,host);
  return source!==null?nativeReadFont(memory,font,palette,source,mapping):0;
}
