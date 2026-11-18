import {nativeAddGamePaletteColor} from './game-palette-memory.js';
const word=(m,p)=>m.byte(p)|(m.byte(p+1)<<8);
const putWord=(m,p,v)=>{m.putByte(p,v&255);m.putByte(p+1,(v>>>8)&255);};

//004B04B0. The FNT reader allocates black for pixel zero, retains the glyph
//lookup/rectangle tables in the source buffer and remaps raw pixels in place.
//The caller supplies the original 256-byte temporary mapping storage.
export function nativeReadFont(memory,font,palette,source,mapping) {
  const size=memory.get(source+4),colors=word(memory,source+10);
  let cursor=source+12;
  memory.putByte(mapping,nativeAddGamePaletteColor(memory,palette,[0,0,0])&255);
  for(let i=1;i<=colors;i++) {
    const rgb=[memory.byte(cursor),memory.byte(cursor+1),memory.byte(cursor+2)];cursor+=3;
    memory.putByte(mapping+i,nativeAddGamePaletteColor(memory,palette,rgb)&255);
  }
  memory.put(font+16,cursor);cursor+=256;
  const height=word(memory,cursor)<<16>>16;cursor+=2;
  putWord(memory,font+4,height);putWord(memory,font+6,Math.trunc(height/5)+1);
  putWord(memory,font+8,word(memory,cursor));cursor+=2;
  while((cursor-source)&3)cursor++;
  memory.put(font+12,cursor);cursor+=(word(memory,font+8)<<16>>16)*12;
  memory.put(font+20,cursor);
  const bytes=Math.trunc(((source+size-cursor)|0)/4)*4;
  for(let i=0;i<bytes;i++)memory.putByte(cursor+i,memory.byte(mapping+memory.byte(cursor+i)));
  return 1;
}
