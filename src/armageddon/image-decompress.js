//004AB3C9. Literal bytes pass through the supplied palette; back references
//copy already translated output, forward one byte at a time (including overlap).
//Like the original, memory ownership/bounds belong to the caller.
export function nativeDecodeImagePixels(memory,destination,source,palette) {
  for(;;) {
    const command=memory.byte(source);
    if(!(command&128)) {
      memory.putByte(destination,memory.byte((palette+command)>>>0));
      source=(source+1)>>>0;destination=(destination+1)>>>0;
      continue;
    }
    let distance=((command&7)<<8)|memory.byte((source+1)>>>0);
    const length=(command>>>3)&15;
    let count;
    if(length) {distance++;count=length+2;source=(source+2)>>>0;}
    else {
      if(!distance)return;
      count=memory.byte((source+2)>>>0)+18;source=(source+3)>>>0;
    }
    for(let i=0;i<count;i++) {
      memory.putByte(destination,memory.byte((destination-distance)>>>0));
      destination=(destination+1)>>>0;
    }
  }
}
