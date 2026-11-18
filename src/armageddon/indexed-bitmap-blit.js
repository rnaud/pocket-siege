import {nativeBitmapStorage,nativeBitmapPixel8} from './bitmap-storage.js';

//004ABE1C preserves the original16-byte/DWORD/byte forward-copy order.
function copyRectangle(memory,destination,dp,source,sp,width,height) {
  for(let y=0;y<height;y++) {
    let x=0;
    for(;x+16<=width;x+=16){const words=[0,4,8,12].map(i=>memory.get(source+y*sp+x+i));words.forEach((v,i)=>memory.put(destination+y*dp+x+i*4,v));}
    for(;x+4<=width;x+=4)memory.put(destination+y*dp+x,memory.get(source+y*sp+x));
    for(;x<width;x++)memory.putByte(destination+y*dp+x,memory.byte(source+y*sp+x));
  }
}
//004933C0 indexed8-bit branch. Preserve destination clipping, native source
//offset/reflection behavior, optional blend table and overlap copy ordering.
export function nativeBlitIndexedBitmap(memory,destination,x,y,width,height,source,sx,sy,table,flags) {
  x|=0;y|=0;width|=0;height|=0;sx|=0;sy|=0;
  if(!width||!height)return 0;
  const storage=nativeBitmapStorage(memory,source);
  if(memory.get(destination+12)!==8||storage.bits!==8)throw new RangeError('Indexed bitmap blit requires8-bit surfaces');
  const left=Math.max(memory.get(destination+28)|0,x),top=Math.max(memory.get(destination+32)|0,y);
  const right=Math.min(memory.get(destination+36)|0,(x+width)|0),bottom=Math.min(memory.get(destination+40)|0,(y+height)|0);
  if(left>=right||top>=bottom)return 0;
  const flip=!!(flags&0x10000),mode=flags&0xffff,w=right-left,h=bottom-top;
  sx=(sx+(flip?x+width-right:left-x))|0;sy=(sy+((flags&0x20000)?y+height-bottom:top-y))|0;
  const dp=memory.get(destination+16),dest=memory.get(destination+8)+Math.imul(top,dp)+left;
  const src=storage.pixels+Math.imul(sy,storage.pitch)+sx;
  if(mode===0) {
    const prefix=w>3&&(dest&3)?4-(dest&3):0;
    if(prefix)copyRectangle(memory,dest,dp,src,storage.pitch,prefix,h);
    copyRectangle(memory,dest+prefix,dp,src+prefix,storage.pitch,w-prefix,h);return 1;
  }
  if(mode===1&&table&&!flip) {
    const bulk=w&~3;
    for(let row=0;row<h;row++)for(let col=0;col<bulk;col+=4) {
      const input=memory.get(src+row*storage.pitch+col);if(!input)continue;
      const old=memory.get(dest+row*dp+col);let output=0;
      for(let i=0;i<4;i++)output|=memory.byte(table+(((old>>>(i*8))&255)*256)+((input>>>(i*8))&255))<<(i*8);
      memory.put(dest+row*dp+col,output);
    }
    for(let row=0;row<h;row++)for(let col=bulk;col<w;col++) {
      const color=memory.byte(src+row*storage.pitch+col),at=dest+row*dp+col;
      if(color)memory.putByte(at,memory.byte(table+memory.byte(at)*256+color));
    }
    return 1;
  }
  for(let row=0;row<h;row++) {
    for(let col=0;col<w;col++) {
      const at=dest+row*dp+(mode===1&&flip&&!table?w-col-1:col);
      const color=mode<=3?memory.byte(src+row*storage.pitch+(mode===1&&flip&&table?w-col-1:col)):nativeBitmapPixel8(memory,source,sx+col,sy+row);
      const old=memory.byte(at);
      if(mode===5){if(old&&color)return 1;continue;}
      if(mode===1&&color)memory.putByte(at,table?memory.byte(table+old*256+color):color);
      else if((mode===2&&color&&old)||(mode===3&&color&&!old))memory.putByte(at,color);
      else if(mode===4&&color)memory.putByte(at,0);
    }
  }
  return mode===5?0:1;
}
