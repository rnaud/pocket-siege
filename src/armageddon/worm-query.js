// Full004DF270. Virtual body operations stay explicit: a placement query
// temporarily changes the collision mode and position, then restores both.
export function nativeWormQuery(memory,event,size,payload,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const out=new DataView(payload.buffer,payload.byteOffset,payload.byteLength);
  if(event===0x7d0) {
    const [x,y]=host.position();
    out.setInt32(0,x,true);out.setInt32(4,y,true);return 1;
  }
  if(event===0x7d1) {
    const mode=host.mode(),[x,y]=host.position();
    host.setMode(body.getInt32(0x190,true));
    const result=host.place(out.getInt32(0,true)<<16,out.getInt32(4,true)<<16);
    host.setMode(2);host.place(x,y);host.setMode(mode);
    return result;
  }
  if(event!==0x7d3)return host.base(event,size,payload);
  out.setInt32(0,body.getInt32(0xfc,true),true);
  out.setInt32(4,body.getInt32(0x100,true),true);
  out.setInt32(8,host.status(),true);
  [0x260,0x25c,0x298,0x29c,0x264,0x26c,0x150].forEach((offset,i)=>out.setInt32(12+i*4,body.getInt32(offset,true),true));
  for(let i=0;i<10;i++)out.setInt32(40+i*4,body.getInt32(0x110+i*4,true),true);
  return 1;
}
