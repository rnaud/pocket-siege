import {nativeOpenArchiveEntry} from './archive-lookup.js';
import {nativeReadArchiveEntry,nativeTellArchiveEntry,nativeDestroyArchiveEntry} from './archive-handle.js';
import {nativeAddGamePaletteColor} from './game-palette-memory.js';
const word=(m,p)=>(m.byte(p)|(m.byte(p+1)<<8))<<16>>16;

//004AFC60/004AFC80. Streamed sprites own a table of renderer surfaces.
export function nativeCreateStreamedSprite(memory,sprite,renderer) {
  memory.put(sprite,0x5266a8);memory.put(sprite+92,renderer);
  memory.putByte(sprite+106,0);memory.putByte(sprite+107,0);
  memory.put(sprite+112,0);memory.put(sprite+88,0);return sprite;
}
export function nativeDestroyStreamedSprite(memory,sprite,flags,host) {
  memory.put(sprite,0x5266a8);
  if(memory.get(sprite+112)) {
    for(let i=0;i<word(memory,sprite+106);i++) {
      const slot=memory.get(sprite+112)+i*12+8;
      if(memory.get(slot))host.releaseSpriteSurface(memory.get(sprite+92),slot);
    }
    host.freeArray(memory.get(sprite+112));
  }
  memory.put(sprite,0x524a14);if(flags&1)host.freeSized(sprite,116);return sprite;
}

//004AFEF0. Surface creation/description/locking are renderer interfaces; file
//reads, palette allocation, rectangles and indexed pixel mapping are native.
export function nativeReadStreamedSprite(memory,sprite,palette,entry,reuse,scratch,host) {
  const read=(dest,size)=>nativeReadArchiveEntry(memory,entry,dest,size,host);
  const mapping=scratch+0x400,colors=scratch+0x100,descriptor=scratch+0x20;
  memory.put(descriptor,108);nativeTellArchiveEntry(memory,entry);
  read(scratch,4);read(scratch+4,4);read(scratch+8,2);
  memory.put(scratch+12,0);read(scratch+12,2);memory.putByte(mapping,0);
  const count=memory.get(scratch+12);read(colors,count*3);
  for(let i=0;i<count;i++)memory.putByte(mapping+i+1,nativeAddGamePaletteColor(memory,palette,[0,1,2].map(c=>memory.byte(colors+i*3+c)))&255);
  for(const [offset,size] of [[100,4],[104,2],[108,2],[110,2]])read(sprite+offset,size);
  memory.putByte(sprite+106,0);memory.putByte(sprite+107,0);read(sprite+106,2);
  if(!reuse)memory.put(sprite+112,host.allocateArray(word(memory,sprite+106)*12,0x5602f4));
  while(nativeTellArchiveEntry(memory,entry)&3)read(scratch+16,1);
  for(let i=0;i<word(memory,sprite+106);i++) {
    read(scratch+12,4);
    for(const offset of [0,2,4,6])read(memory.get(sprite+112)+i*12+offset,2);
  }
  for(let i=0;i<word(memory,sprite+106);i++) {
    const frame=memory.get(sprite+112)+i*12;
    const width=word(memory,frame+4)-word(memory,frame),height=word(memory,frame+6)-word(memory,frame+2);
    if(!Math.imul(width,height)){memory.put(frame+8,0);continue;}
    if(!reuse&&host.createSpriteSurface(memory.get(sprite+92),frame+8,width,height,0x4000))
      host.createSpriteSurface(memory.get(sprite+92),memory.get(sprite+112)+i*12+8,width,height,0x800);
    host.describeSpriteSurface(memory.get(memory.get(sprite+112)+i*12+8),descriptor);
    const pixels=host.lockSpriteSurface(memory.get(sprite+92),memory.get(memory.get(sprite+112)+i*12+8));
    for(let y=0;y<height;y++)read(pixels+Math.imul(memory.get(descriptor+16),y),width);
    const pitch=memory.get(descriptor+16),bytes=Math.trunc(width/4)*4;
    for(let y=0;y<height;y++)for(let x=0;x<bytes;x++) {
      const at=pixels+Math.imul(pitch,y)+x;memory.putByte(at,memory.byte(mapping+memory.byte(at)));
    }
    host.unlockSpriteSurface(memory.get(memory.get(sprite+112)+i*12+8));
  }
  return 1;
}

//004AFE00. Keep the original name and archive for subsequent surface reloads.
export function nativeLoadStreamedSprite(memory,sprite,palette,archive,name,scratch,host) {
  let length=0;while(memory.byte(name+length))length++;length++;
  let i=0;for(;i+4<=length;i+=4)memory.put(sprite+8+i,memory.get(name+i));
  for(;i<length;i++)memory.putByte(sprite+8+i,memory.byte(name+i));
  memory.put(sprite+88,archive);memory.put(sprite+96,palette);
  const entry=nativeOpenArchiveEntry(memory,archive,name,host);if(!entry)return 0;
  const result=nativeReadStreamedSprite(memory,sprite,memory.get(sprite+96),entry,0,scratch,host);
  nativeDestroyArchiveEntry(memory,entry,1,host);return result;
}
