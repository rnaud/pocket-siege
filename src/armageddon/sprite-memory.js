import {nativeAddGamePaletteColor} from './game-palette-memory.js';
const word=(m,p)=>m.byte(p)|(m.byte(p+1)<<8);
const putWord=(m,p,v)=>{m.putByte(p,v&255);m.putByte(p+1,(v>>>8)&255);};

//004AF790. The original parser mutates the owned SPR buffer: its color table
//becomes the palette-index map. Compressed pixels are decoded later by drawing.
export function nativeReadSprite(memory,sprite,palette,source,host) {
  let cursor=source+8;
  const size=memory.get(source+4);
  memory.put(0x5602e4,memory.get(0x5602e4)+size);
  memory.put(sprite+0x24,cursor);
  putWord(memory,sprite+0x10,word(memory,cursor));cursor+=2;
  memory.put(sprite+0x2c,cursor);
  const colors=word(memory,cursor);cursor+=2;
  memory.put(0x5602f0,memory.get(0x5602f0)+colors*3);
  for(let i=1;i<=colors;i++) {
    const rgb=[memory.byte(cursor),memory.byte(cursor+1),memory.byte(cursor+2)];cursor+=3;
    memory.putByte(memory.get(sprite+0x2c)+i,nativeAddGamePaletteColor(memory,palette,rgb)&255);
  }
  memory.putByte(memory.get(sprite+0x2c),0);
  if(memory.byte(sprite+0x11)&64) {
    putWord(memory,sprite+0x1c,word(memory,cursor));cursor+=2;
    while((cursor-source)&3)cursor++;
    memory.put(sprite+0x18,cursor);cursor+=word(memory,sprite+0x1c)*12;
  }
  memory.put(sprite+4,memory.get(cursor));cursor+=4;
  for(const offset of [12,8,10,14]){putWord(memory,sprite+offset,word(memory,cursor));cursor+=2;}
  while((cursor-source)&3)cursor++;
  memory.put(sprite+0x14,cursor);cursor+=word(memory,sprite+14)*12;
  memory.put(sprite+0x28,cursor);
  if(!(memory.byte(sprite+0x11)&64)) {
    const bytes=Math.trunc(((source+size-cursor)|0)/4)*4;
    for(let i=0;i<bytes;i++)memory.putByte(cursor+i,memory.byte(memory.get(sprite+0x2c)+memory.byte(cursor+i)));
  }
  const bitmap=host.allocate(44);
  if(bitmap) {
    //00492C90(0,0,8,0,0), followed by derived bitmap vtable.
    for(const [offset,value] of [[0,0x526390],[12,8],[20,0],[24,0],[16,0],[8,0],[28,0],[32,0],[36,0],[4,1],[40,0]])memory.put(bitmap+offset,value);
    memory.put(bitmap,0x5249b0);
  }
  memory.put(sprite+0x20,bitmap);
  for(let i=0;i<word(memory,sprite+14);i++) {
    const frame=memory.get(sprite+0x14)+i*12;
    const signed=p=>word(memory,p)<<16>>16;
    const area=Math.imul(signed(frame+8)-signed(frame+4),signed(frame+10)-signed(frame+6));
    memory.put(0x5602ec,memory.get(0x5602ec)+area);
  }
  memory.put(0x5602e8,memory.get(0x5602e8)+word(memory,sprite+14));
  return 1;
}
