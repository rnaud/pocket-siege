//0049D2CE..0049D454. Display-device policy, world bounds and initial camera targets.
export function nativeInitializeSceneDisplay(memory,scene,host) {
  const forced=memory.byte(scene+0x11d67)!==0;
  if(forced||memory.get(scene+0x1b8ac)) {
    host.configureDisplay(memory.get(scene+0x24),...(forced?[1,1,1,1]:[0,0,1,0]),memory.get(scene+0x12444),memory.get(scene+0x12438));
    if(forced)memory.put(scene+0x1b8ac,1);
  }
  memory.put(scene+0x1b8c4,0);memory.put(scene+0x1b8c8,0);
  const bounded=memory.get(scene+0x1b8ac)!==0;
  memory.put(scene+0x1b8cc,bounded?0x20000:0xf8020000);
  memory.put(scene+0x1b8d4,bounded?0x20000:0xf8020000);
  memory.put(scene+0x1b8d0,bounded?0x77e0000:0xf7e0000);
  memory.put(scene+0x1b8d8,0x3580000);
  const top=memory.get(scene+0x1b8d4)|0;
  if(((memory.get(scene+0x1b8d8)-top)&0xffff0000)<0x3000000)memory.put(scene+0x1b8d8,top+0x3000000);
  //004C5210 changes only the three coordinates, retaining both surrounding words.
  for(const offset of [0x1c96c,0x1c980]) {
    memory.put(scene+offset+4,0x3c00000);memory.put(scene+offset+8,0x15c0000);memory.put(scene+offset+12,0);
  }
  for(let i=0;i<memory.byte(scene+0x4886);i++) {
    if(memory.byte(scene+0x4888+i*3000)&128){memory.putByte(scene+0x11d3e,0);break;}
  }
}
