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

//0048B740.8-bit pixel lookup respects signed clipping bounds.
export function nativeBitmapPixel8(memory,bitmap,x,y) {
  x|=0;y|=0;
  if(x<(memory.get(bitmap+28)|0)||x>=(memory.get(bitmap+36)|0)||y<(memory.get(bitmap+32)|0)||y>=(memory.get(bitmap+40)|0))return 0;
  return memory.byte((memory.get(bitmap+8)+Math.imul(y,memory.get(bitmap+16))+x)>>>0);
}

//0048B7C0 +00492D30. Borrowed pixel buffers are retained; owned ones are freed
//before the final base vtable and optional sized object deletion.
export function nativeDestroyBitmap8(memory,bitmap,flags,host) {
  memory.put(bitmap,0x5249b0);
  const borrowed=memory.get(bitmap+4);
  memory.put(bitmap,0x526390);
  if(!borrowed)host.free(memory.get(bitmap+8));
  memory.put(bitmap,0x524a14);
  if(flags&1)host.freeSized(bitmap,44);
  return bitmap;
}
