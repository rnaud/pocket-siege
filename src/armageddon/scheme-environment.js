//00417278..004175EA. Expand scheme environment/match settings into setup.
//The preceding time/CRT reseed and weapon settings are separate stages.
export function nativeExpandSchemeEnvironment(memory,scheme,descriptors) {
  const out=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const input=new DataView(descriptors.buffer,descriptors.byteOffset,descriptors.byteLength);
  const signed=offset=>scheme[offset]<<24>>24;
  const short=(offset,value)=>out.setInt16(offset,value,true);
  memory[0xd430]=100;short(0xd432,100);memory[0xd434]=96;short(0xd436,150);short(0xd438,150);
  for(const [to,from] of [[0xd5d2,0x14],[0xd5d6,3],[0xd5d7,0x13],[0xd5dc,1],[0xd5db,2],
    [0xd5fd,0xd],[0xd5e9,0xf],[0xd5eb,0x23],[0xd605,0x1b],[0xd606,0x1a],[0xd607,0x19],
    [0xd608,0x1c],[0xd5fc,0x1d],[0xd5fe,0],[0xd5ff,0x18]])memory[to]=scheme[from];
  memory[0xd5d3]=scheme[9]?1:0;memory[0xd5d4]=scheme[5]*50;memory[0xd5f3]=1;
  short(0xd5d8,scheme[4]?350:25000);memory[0xd5da]=scheme[4]?3:20;
  short(0xd5de,signed(0x17)<0?-signed(0x17):signed(0x17)*60);short(0xd5e0,signed(0x16));
  memory[0xd5f6]=0;
  const mode=signed(0x11);
  memory[0xd5e3]=[1,2,5].includes(mode)?8:0;
  memory[0xd5e4]=mode===2?1:mode===5?2:0;
  memory[0xd5e2]=[0,1,5].includes(mode)?scheme[0x12]===4?255:scheme[0x12]:3;
  if(mode!==1&&mode!==5)memory[0xd5d7]=0;
  memory[0xd5e5]=0;
  const divisor=Math.max(1,[0xc,0xe,0x10].filter(offset=>signed(offset)>0).length);
  for(const [i,offset] of [0xc,0xe,0x10].entries())memory[0xd5e6+i]=Math.trunc(signed(offset)/divisor);
  const mine=signed(0xa);
  memory[0xd5f1]=[1,2,3].includes(mine)?0:1;
  memory[0xd5ec]=scheme[0xb]*scheme[0xb]*5;
  short(0xd5ee,mine===1?5:mine===2?-1:0);memory[0xd5f2]=mine===1?1:0;
  memory[0xd5f0]=1;memory[0xd603]=Math.imul(input.getInt32(0xc8,true),25);
  memory[0xd602]=Math.imul(input.getInt32(0xc0,true),20);memory[0xd5fa]=1;
  out.setInt32(0xd60c,1,true);
}
