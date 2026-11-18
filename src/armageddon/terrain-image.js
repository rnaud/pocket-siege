import {nativeOpenArchiveEntry} from './archive-lookup.js';
import {nativeTellArchiveEntry,nativeReadArchiveEntry,nativeDestroyArchiveEntry} from './archive-handle.js';
import {nativeDecodeImagePixels} from './image-decompress.js';
import {nativeCreatePanelImage} from './panel-resources.js';
import {nativeBitmapStorage,nativeRemapBitmap} from './bitmap-storage.js';
import {nativeAddGamePaletteColor} from './game-palette-memory.js';
//004F08E0 embedded IMG reader. scratch supplies the original0x428-byte
//temporary frame (starting at original ESP+0x10). Heap/file transport remain
//services; bitmap operations, palette insertion and decompression default to native.
export function nativeLoadTerrainImage(memory,palette,file,scratch,host) {
  const word=a=>memory.byte(a)|(memory.byte(a+1)<<8);
  memory.put(scratch+24,host.tellFile(file));
  host.readFile(scratch+20,4,1,file);
  if(memory.get(scratch+20)!==0x1a474d49)return 0;
  host.readFile(scratch+28,4,1,file);
  host.readFile(scratch+6,2,1,file);
  if(memory.byte(scratch+7)&128) {
    host.readFile(scratch,2,1,file);
    memory.putByte(scratch+40,0);
    host.readFile(scratch+296,3,word(scratch),file);
    for(let i=0;i<word(scratch);i++) {
      const color=Array.from({length:3},(_,j)=>memory.byte(scratch+296+i*3+j));
      memory.putByte(scratch+41+i,host.addPaletteColor?host.addPaletteColor(palette,color):nativeAddGamePaletteColor(memory,palette,color));
    }
  }
  host.readFile(scratch+2,2,1,file);
  host.readFile(scratch+4,2,1,file);
  const bits=memory.byte(scratch+6);
  if(bits!==1&&bits!==8)return 0;
  const bitmap=host.allocate(0x2c);
  if(bitmap) {
    if(host.constructBitmap)host.constructBitmap(bitmap,word(scratch+2),word(scratch+4),bits);
    else nativeCreatePanelImage(memory,bitmap,word(scratch+2),word(scratch+4),bits,host);
    memory.put(bitmap,bits===1?0x526328:0x5249b0);
  }
  //The original also calls through a null bitmap after allocation failure.
  const storage=host.bitmapStorage?host.bitmapStorage(bitmap):nativeBitmapStorage(memory,bitmap);
  memory.put(scratch+8,storage.pixels);memory.put(scratch+32,storage.bits);memory.put(scratch+36,storage.pitch);
  if(host.alignImagePixels)host.alignImagePixels(file);
  if(memory.byte(scratch+7)&64) {
    const start=memory.get(scratch+24),position=host.tellFile(file);
    const remaining=(start-position+memory.get(scratch+28))>>>0;
    host.readFile(0x714be0,remaining,1,file);
    if(host.decodeTerrainPixels)host.decodeTerrainPixels(memory.get(scratch+8),0x714be0,scratch+40);
    else nativeDecodeImagePixels(memory,memory.get(scratch+8),0x714be0,scratch+40);
  } else {
    for(let y=0;y<word(scratch+4);y++) {
      const packed=(Math.imul(word(scratch+2),memory.get(scratch+32))+7)|0;
      const size=Math.trunc(packed/8)>>>0;
      host.readFile((memory.get(scratch+8)+Math.imul(y,memory.get(scratch+36)))>>>0,size,1,file);
    }
    if(memory.byte(scratch+7)&128) {
      if(host.remapBitmap)host.remapBitmap(bitmap,scratch+40);
      else nativeRemapBitmap(memory,bitmap,scratch+40);
    }
  }
  return bitmap;
}

//00492750. Archive IMG payloads start on a four-byte entry-relative boundary.
//The transport defaults to original archive handles; bitmap/palette services
//share the same original operations as the embedded terrain reader.
export function nativeLoadArchiveImage(memory,palette,handle,scratch,host) {
  const tell=host.tellArchiveEntry??(entry=>nativeTellArchiveEntry(memory,entry));
  const read=host.readArchiveEntry??((entry,dest,size)=>nativeReadArchiveEntry(memory,entry,dest,size,host));
  return nativeLoadTerrainImage(memory,palette,handle,scratch,{
    ...host,
    tellFile:tell,
    readFile:(dest,size,count,entry)=>read(entry,dest,Math.imul(size,count)),
    alignImagePixels:entry=>{while(tell(entry)&3){if(host.readArchiveByte)host.readArchiveByte(entry);else read(entry,scratch+0x428,1);}},
  });
}

//00492710. The named loader owns the entry handle, including decode failure.
export function nativeLoadNamedArchiveImage(memory,palette,archive,name,scratch,host) {
  const handle=nativeOpenArchiveEntry(memory,archive,name,host);
  if(!handle)return 0;
  const bitmap=nativeLoadArchiveImage(memory,palette,handle,scratch,host);
  nativeDestroyArchiveEntry(memory,handle,1,host);
  return bitmap;
}
