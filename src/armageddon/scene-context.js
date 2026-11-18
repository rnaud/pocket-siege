//004A5350..004A55E3. Allocate the original scene context and transfer the
//frontend payload before graphics/terrain services and0049CA90 initialization.
//Palette construction is a temporary resource supplied by the host.
export function nativeCreateSceneContext(memory, owner, bindings, frontend, host) {
  host.initializePalette(1,254);
  const scene=host.allocate(0x1d44c);
  if(scene) {
    memory.put(scene,0x524a14);memory.put(scene+0x824,0x526570);
    for(let i=0;i<256;i++){memory.put(scene+0x1030+i*4,-1);memory.put(scene+0x828+i*4,i);}
    memory.put(scene+0xc28,256);memory.put(scene+0x102c,0);
    for(const [offset,table,a,b] of [[0x1430,0x52656c,0x1474,0x14b8],[0x14bc,0x52656c,0x1500,0x1544],[0x1548,0x526568,0x1668,0x1788],[0x178c,0x52657c,0x1920,0x1ab4],[0x1ad4,0x52656c,0x1b18,0x1b5c]]) {
      memory.put(scene+offset,table);memory.put(scene+a,0);memory.put(scene+b,0);
    }
    memory.put(scene+0x1b94,0x526894);memory.put(scene+0x3a48,0);
    memory.put(scene+0x12490,0);
    for(let i=0;i<14;i++)memory.put(scene+0x124a4+i*20,0);
    for(let i=0;i<71;i++)memory.put(scene+0x125bc+i*0x208,0x526580);
    const word=(address,value)=>{memory.putByte(address,value&255);memory.putByte(address+1,(value>>>8)&255);};
    for(const offset of [0x1b774,0x1b7dc,0x1b844]) {
      memory.put(scene+offset,0x526574);
      for(let i=0;i<16;i++)word(scene+offset+4+i*2,i);
      word(scene+offset+0x24,16);word(scene+offset+0x66,0);
    }
    for(const offset of [0x1c96c,0x1c980,0x1d2bc,0x1d2d0]) {
      memory.put(scene+offset,0x52689c);
      for(const delta of [4,8])memory.put(scene+offset+delta,0);
      memory.put(scene+offset+16,0x1000000);memory.put(scene+offset+12,0);
    }
    memory.put(scene,0x526578);
  }
  memory.put(owner+0x5cd0,scene);
  //Original requires allocation success and immediately dereferences this.
  for(const [index,offset] of [[0,8],[1,12],[2,4],[3,16],[4,24],[5,20],[7,28],[6,32]])
    memory.put(memory.get(owner+0x5cd0)+offset,bindings[index]);
  const dest=memory.get(owner+0x5cd0)+0x47a8;
  //REP MOVSD is forward, including overlapping source/destination ranges.
  for(let i=0;i<0xdc64;i+=4)memory.put(dest+i,memory.get(frontend+i));
  return scene;
}
