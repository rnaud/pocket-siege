//Shared native presentation-slot claim and front-rank promotion.
export function nativeClaimPresentationSlot(memory,scene) {
  let slot=-1;
  if(memory.get(scene+0xc28)) {
    memory.put(scene+0xc28,memory.get(scene+0xc28)-1);slot=memory.get(scene+0x828+memory.get(scene+0xc28)*4)|0;
    const count=memory.get(scene+0x102c);memory.put(scene+0x1030+slot*4,count);memory.put(scene+0xc2c+count*4,slot);memory.put(scene+0x102c,count+1);
  }
  const rank=memory.get(scene+0x1030+slot*4)|0;
  if(rank) {
    for(let i=0;i<(memory.get(scene+0x102c)|0);i++) {
      const at=scene+0x1030+memory.get(scene+0xc2c+i*4)*4;
      if((memory.get(at)|0)<rank)memory.put(at,memory.get(at)+1);
    }
    memory.put(scene+0x1030+slot*4,0);
  }
  return slot;
}

//004D1380 /004E9790: close the rank gap and swap the last active slot.
export function nativeReleasePresentationSlot(memory,scene,slot) {
  const rank=memory.get(scene+0x1030+slot*4)|0;
  for(let i=0;i<(memory.get(scene+0x102c)|0);i++) {
    const at=scene+0x1030+memory.get(scene+0xc2c+i*4)*4;
    if((memory.get(at)|0)>rank)memory.put(at,memory.get(at)-1);
  }
  for(let i=0;i<(memory.get(scene+0x102c)|0);i++) {
    if((memory.get(scene+0xc2c+i*4)|0)!==(slot|0))continue;
    memory.put(scene+0x828+memory.get(scene+0xc28)*4,slot);memory.put(scene+0xc28,memory.get(scene+0xc28)+1);
    const last=(memory.get(scene+0x102c)-1)|0;memory.put(scene+0x102c,last);
    memory.put(scene+0xc2c+i*4,memory.get(scene+0xc2c+last*4));memory.put(scene+0x1030+slot*4,-1);break;
  }
}
