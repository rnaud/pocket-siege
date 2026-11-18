import {nativeFindClosestGamePaletteColor} from './game-palette-memory.js';
const word=(m,p)=>(m.byte(p)|(m.byte(p+1)<<8))<<16>>16;

//004982C0. Build the renderer's additive indexed-color lookup. Enumeration
//resets/advances each palette cursor; later banks overwrite shared indices.
export function nativeBuildRendererBlendTable(memory,renderer) {
  if(!memory.get(renderer+0x14b2c))return;
  const colors=new Uint8Array(768),table=renderer+0x4b2c;
  for(let i=0;i<65536;i+=4)memory.put(table+i,0);
  for(let bank=0;bank<8;bank++) {
    const palette=memory.get(renderer+0x4ae4+bank*4);if(!palette)continue;
    memory.put(palette+0xb14,0);
    for(let i=0;i<word(memory,palette+0x90e);i++) {
      const index=word(memory,palette+0x910+i*2);
      memory.put(palette+0xb14,i+1);
      for(let c=0;c<3;c++)colors[index*3+c]=memory.byte(palette+12+index*6+c*2);
    }
  }
  for(let dest=0;dest<256;dest++)for(let source=0;source<256;source++) {
    const r=Math.min(255,colors[source*3]+colors[dest*3]);
    const g=Math.min(255,colors[source*3+1]+colors[dest*3+1]);
    const b=Math.min(255,colors[source*3+2]+colors[dest*3+2]);
    let best=10000000,selected=0;
    // Search all nonzero indices, including unused black entries. Ties keep
    //the earliest index; this differs from searching only allocated colors.
    for(let index=1;index<256;index++) {
      const distance=Math.abs(colors[index*3]-r)*3+Math.abs(colors[index*3+1]-g)*5+Math.abs(colors[index*3+2]-b)*2;
      if(distance<best){best=distance;selected=index;}
    }
    memory.putByte(table+source*256+dest,selected);
  }
  memory.put(renderer+0x14b2c,0);memory.put(renderer+0x2c,0);
  memory.put(renderer+0x30,nativeFindClosestGamePaletteColor(memory,memory.get(renderer+0x4ae8),[28,67,35]));
  memory.put(renderer+0x34,0);
}
