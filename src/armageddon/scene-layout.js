function putShort(memory,address,value) {
  memory.putByte(address,value&255);memory.putByte(address+1,(value>>>8)&255);
}
//004ADAC0: inclusive signed16 free-ID range, descending allocation stack.
export function nativeCreateIdPool(memory,address,lower,upper) {
  memory.put(address,0x5265f0);memory.put(address+4,lower);
  putShort(memory,address+0x90e,0);memory.put(address+8,upper);
  const count=((upper-lower+1)<<16)>>16;
  putShort(memory,address+0x70c,count);
  for(let i=0;i<count;i++)putShort(memory,address+0x70e+i*2,upper-i);
  memory.put(address+0xb14,0);
  for(let offset=0x60c;offset<0x70c;offset+=4)memory.put(address+offset,0);
  memory.put(address+0xb10,0);return address;
}
//0049CCB2..0049CE7F: initial pools and viewport-dependent presentation fields.
export function nativeCreateInitialSceneLayout(memory,owner,scene,host) {
  for(const offset of [0x3c,0x40,0x44]) {
    const pool=host.allocate(0xb18);
    memory.put(owner+offset,pool?nativeCreateIdPool(memory,pool,1,255):0);
  }
  for(const offset of [0x274,0x278,0x27c,0x20c])memory.put(owner+offset,-1);
  for(const offset of [0x294,0x28c,0x15c,0x160,0x164,0x168,0x16c,0x210,0x194])memory.put(owner+offset,0);
  const height=memory.get(scene+0x1b8e8)|0,large=height>=768;
  memory.put(owner+0x190,large?16:12);
  for(const [i,value] of (large?[16,15,13,10,12,11,9]:[8,7,5,2,4,3,1]).entries())memory.put(owner+0x170+i*4,value);
  memory.put(owner+0x18c,height<600?6:10);memory.put(owner+0x208,1);
  for(let offset=0x1d8;offset<0x208;offset+=4)memory.put(owner+offset,-1);
}
//004ADB30: pool storage is inline; only the outer allocation is released.
export function nativeDestroyInitialScenePools(memory,owner,flags,host) {
  for(const offset of [0x3c,0x40,0x44]) {
    const pool=memory.get(owner+offset);if(!pool)continue;
    memory.put(pool,0x524a14);if(flags&1)host.release(pool,0xb18);
  }
}
