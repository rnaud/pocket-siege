//004CBFC0 +004F0410, with the common bitmap dimension accessor00492E50.
//Fields beyond the initialized shape header retain their allocator contents.
export function nativeCreateTerrainShape(memory,shape,x,y,bitmap) {
  memory.put(shape,0x527500);
  memory.put(shape,0x526920);
  memory.put(shape+20,x);memory.put(shape+24,y);
  memory.put(shape+4,0);memory.put(shape+8,1);
  memory.put(shape+12,memory.get(bitmap+20));
  memory.put(shape+16,memory.get(bitmap+24));
  memory.put(shape+28,bitmap);
  return shape;
}

//004A7B3A..004A7BF6: final terrain state and collision representation.
export function nativeInitializeTerrainState(memory,terrain,host) {
  const bitmap=memory.get(terrain+0x904);
  const width=memory.get(bitmap+20),height=memory.get(bitmap+24);
  memory.put(terrain+0x8e0,0x60000);
  const storage=host.allocateArray(0x60000,0x55f7cc);
  memory.put(terrain+0x8d8,storage);
  for(const offset of [0x8dc,0x8d4,0x8ec,0x8f0,0x8d0,0xb10,0xb14])memory.put(terrain+offset,0);
  memory.put(terrain+0xb18,width);memory.put(terrain+0xb1c,height);
  memory.put(terrain+0xb28,0);
  const shape=host.allocate(0x9c);
  memory.put(terrain+0xc4,shape?nativeCreateTerrainShape(memory,shape,0,0,memory.get(terrain+0x908)):0);
  return terrain;
}
