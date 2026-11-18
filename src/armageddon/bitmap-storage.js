//00492EF0: common bitmap storage descriptor.
export function nativeBitmapStorage(memory,bitmap) {
  return {bits:memory.get(bitmap+12),pixels:memory.get(bitmap+8),pitch:memory.get(bitmap+16)};
}

//00492DB0 +004AB6D9. Remap every byte of each padded8-bit row. The original
//kernel requires nonzero row/word counts; retain its decrement-loop behavior.
export function nativeRemapBitmap(memory,bitmap,palette) {
  if(memory.get(bitmap+12)!==8)return 0;
  let destination=memory.get(bitmap+8),rows=memory.get(bitmap+24);
  const pitch=memory.get(bitmap+16),words=(pitch|0)>>2;
  const skip=(pitch-(words<<2))|0;
  do {
    let count=words>>>0;
    do {
      for(let i=0;i<4;i++) {
        memory.putByte(destination,memory.byte((palette+memory.byte(destination))>>>0));
        destination=(destination+1)>>>0;
      }
      count=(count-1)>>>0;
    } while(count);
    destination=(destination+skip)>>>0;
    rows=(rows-1)>>>0;
  } while(rows);
  return 1;
}
