//004C2640. Import native setup records into the scene+1B94 inventory/team
//block. Preserve untouched bytes: names are copied through NUL, not padded.
export function nativeInitializeInventory(memory, setup) {
  const out=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const input=new DataView(setup.buffer,setup.byteOffset,setup.byteLength);
  const write=(offset,value)=>out.setInt32(offset,value,true);
  const copyName=(from,to)=>{
    let end=from;while(setup[end])end++;
    memory.set(setup.subarray(from,end+1),to);
  };
  write(4,0);write(8,0);
  for(let bank=0;bank<setup[0xcd38];bank++) {
    for(let slot=0;slot<71;slot++) {
      const from=0xcd3c+bank*0x11e+slot*2,to=0x1eb8+bank*0x238+slot*4;
      const count=input.getInt16(from,true);
      write(to,count);write(to+0x11c,count?input.getInt16(from+0x8e,true):0);
    }
  }
  write(0x2c08,setup[0xcd38]);
  for(let team=0;team<setup[0xde];team++) {
    const from=0xc94+team*3000,to=0xc+team*0x51c;
    copyName(from-0xbae,to);
    let health=0;
    for(let worm=0;worm<setup[from];worm++) {
      const record=from-0x140+worm*40,name=to+0x90+worm*0x9c,end=name+0x9c;
      copyName(record+3,name);
      write(name-0x78,100);
      const hp=input.getUint16(record,true);
      write(name-0x20,hp);write(name-0x1c,hp);health=(health+hp)|0;
      for(const offset of [-0xc0,-0xb4,-0xb0,-0xac,-0xa8,-0xa0,-0x104,-0x100,-0x110,-0x108,
        -0xfc,-0xf8,-0xf4,-0xf0,-0xec,-0xe8,-0xe4,-0xe0,-0xdc,-0xd8,-0xd4,-0xd0,-0xcc,-0xc8,-0xc4,
        -0xa4,-0x88,-0x84,-0x80,-0x7c])write(end+offset,0);
    }
    for(const offset of [0x4f8,0x504,0x50c,0x500,0x514])write(to+offset,0);
    write(to+0x508,input.getInt8(from-0xbb4));
    write(to+0x14,health);write(to+0x510,setup[from]);
    write(to+0x4fc,setup[from-0xbb2]);write(to+0x518,input.getInt8(from-0xbb1));
  }
  write(0x1eb4,setup[0xde]);
}
