//00419150..004194CB. Build native player/team/worm setup records.
//The following filesystem speech-bank fallback pass remains a host boundary.
//frontend begins at006E0000; scheme is the216-byte active scheme payload.
export function nativeBuildTeamSetup(memory,frontend,scheme,host) {
  const out=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const input=new DataView(frontend.buffer,frontend.byteOffset,frontend.byteLength);
  const copy=(from,to,size)=>memory.set(frontend.subarray(from,from+size),to);
  const signed=value=>value<<24>>24;
  const owner=input.getInt32(0x1180,true),players=new Int32Array(13),banks=new Map();
  memory[0xd610]=owner;memory[0x3c]=frontend[0x687e];memory[0x11a]=frontend[0x6880];
  const alliances=new Set();
  for(let i=0;i<6;i++)if(frontend[0x179c+i*0xd7b+0x124])alliances.add(frontend[0x179d+i*0xd7b]);
  memory[0xcd74]=[...alliances].filter(value=>value<6).length;
  let active=0;
  for(let i=0;i<13;i++) {
    const from=0x1184+i*0x78;
    if(!frontend[from+0x74])continue;
    players[i]=active;if(i===owner)memory[0xd610]=active;
    copy(from,0x3d+active*17,17);active++;
  }
  active=0;
  for(let i=0;i<6;i++) {
    const from=0x179c+i*0xd7b,to=0x11c+active*3000,speech=0xd812+active*0xc2;
    if(!frontend[from+0x124])continue;
    const controller=input.getInt8(from),alliance=frontend[from+1];
    memory[to]=controller<0?controller:players[controller];
    out.setInt32(to+0x18,input.getInt8(from+0x126)+1,true);
    for(let pixel=0;pixel<256;pixel++)copy(from+0x67b+pixel*4,to+0x1c+pixel*3,3);
    copy(from+0xa7b,to+0x31c,0x300);
    if(!banks.has(alliance))banks.set(alliance,banks.size);
    out.setInt32(to+0xa70,controller>=0&&host.handicapEnabled()?input.getInt8(0x11fb+controller*0x78):0,true);
    memory[to+3]=banks.get(alliance);memory[to+2]=frontend[from+0x9a];
    memory[to+1]=alliance;memory[to+5]=frontend[from+2];
    for(let pixel=0;pixel<256;pixel++)copy(from+0x127+pixel*4,to+0x61c+pixel*3,3);
    copy(from+0x527,to+0x91c,0x154);copy(from+3,to+6,17);
    copy(from+0x14,speech+0x81,65);
    memory.set(host.speechPath(Boolean(frontend[from+0x96])),speech);
    const hp=(scheme[0x15]+Math.trunc(scheme[0x15]*signed(frontend[from+0x99])*25/100))&65535;
    for(let worm=0;worm<8;worm++) {
      const record=to+0xa74+worm*40;
      out.setUint16(record,hp,true);copy(from+0x9b+worm*17,record+3,17);
      memory[record+26]=scheme[6];
      memory.fill(0,record+20,record+26);memory.fill(0,record+28,record+31);memory.fill(0,record+32,record+40);
    }
    memory[to+0xbb4]=frontend[from+0x98];active++;
  }
}
