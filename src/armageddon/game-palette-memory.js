const word=(memory,address)=>(memory.byte(address)|(memory.byte(address+1)<<8))<<16>>16;
const putWord=(memory,address,value)=>{memory.putByte(address,value&255);memory.putByte(address+1,(value>>>8)&255);};

//004ADAC0. Retain untouched colors/list storage, including constructor order.
export function nativeCreateGamePalette(memory,palette,first,last) {
  memory.put(palette,0x5265f0);memory.put(palette+4,first);
  putWord(memory,palette+0x90e,0);memory.put(palette+8,last);
  putWord(memory,palette+0x70c,last-first+1);
  for(let i=0;i<word(memory,palette+0x70c);i++)putWord(memory,palette+0x70e+i*2,last-i);
  memory.put(palette+0xb14,0);
  for(let i=0;i<0x100;i++)memory.putByte(palette+0x60c+i,0);
  memory.put(palette+0xb10,0);
  return palette;
}

//004ADCB0. Native signed WORD free/used lists; index zero is never reused
//by color matching. Exhaustion returns-1, which the IMG reader stores as255.
export function nativeAddGamePaletteColor(memory,palette,color) {
  const rgb=color.map(v=>(v<<16)>>16);
  for(let i=0;i<word(memory,palette+0x90e);i++) {
    const index=word(memory,palette+0x910+i*2);
    if(index!==0&&rgb.every((v,c)=>word(memory,palette+12+index*6+c*2)===v))return index;
  }
  const free=word(memory,palette+0x70c);
  if(!free)return -1;
  putWord(memory,palette+0x70c,free-1);
  const index=word(memory,palette+0x70e+((free-1)<<16>>16)*2);
  const used=word(memory,palette+0x90e);
  putWord(memory,palette+0x910+used*2,index);putWord(memory,palette+0x90e,used+1);
  for(let c=0;c<3;c++)putWord(memory,palette+12+index*6+c*2,rgb[c]);
  memory.putByte(palette+0x60c+index,1);memory.put(palette+0xb10,1);
  return index;
}

//004ADD80: nearest used nonzero index, with original weighted RGB distance.
//Ties retain the first index; an empty palette leaves the error output intact.
export function nativeFindClosestGamePaletteColor(memory,palette,color,error) {
  const rgb=color.map(v=>v<<16>>16);let selected=0,best=1000000;
  for(let i=0;i<word(memory,palette+0x90e);i++) {
    const index=word(memory,palette+0x910+i*2);
    if(!index)continue;
    const distance=rgb.reduce((sum,v,c)=>sum+Math.abs(word(memory,palette+12+index*6+c*2)-v)*[3,5,2][c],0);
    if(!distance){if(error)error.value=0;return index;}
    if(distance<best){best=distance;selected=index;}
  }
  if(selected&&error)error.value=Math.trunc(best*100/765);
  return selected;
}

//004ADC60: only active colors inside the signed palette bounds are copied.
//Failed reads retain the caller's previous RGB storage.
export function nativeReadGamePaletteColor(memory,palette,index,output) {
  index|=0;
  if(index<(memory.get(palette+4)|0)||index>(memory.get(palette+8)|0)||!memory.byte(palette+0x60c+index))return 0;
  for(let c=0;c<3;c++)output[c]=word(memory,palette+12+index*6+c*2);
  return 1;
}

//004A6ED0: copy palette state without replacing the destination vtable.
//Preserve the original forward DWORD/WORD/byte order for overlapping storage.
export function nativeCopyGamePalette(memory,destination,source) {
  memory.put(destination+4,memory.get(source+4));memory.put(destination+8,memory.get(source+8));
  for(let i=0;i<256;i++) {
    memory.put(destination+12+i*6,memory.get(source+12+i*6));
    putWord(memory,destination+16+i*6,word(memory,source+16+i*6));
  }
  for(let i=0;i<256;i++)memory.putByte(destination+0x60c+i,memory.byte(source+0x60c+i));
  for(const [count,list] of [[0x70c,0x70e],[0x90e,0x910]]) {
    putWord(memory,destination+count,word(memory,source+count));
    for(let i=0;i<256;i++)putWord(memory,destination+list+i*2,word(memory,source+list+i*2));
  }
  for(const offset of [0xb10,0xb14])memory.put(destination+offset,memory.get(source+offset));
  return destination;
}
