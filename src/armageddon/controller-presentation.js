import { fixedMultiply } from './numeric.js';
const abs32=v=>((v^(v>>31))-(v>>31))|0;
function approach(current,target,minimum) {
  const step=Math.max(minimum,abs32(fixedMultiply((target-current)|0,0x1999)));
  if(abs32((target-current)|0)<=step)return target;
  return (current+(current<=target?step:-step))|0;
}
function slide(current,target) {
  if(abs32((target-current)|0)<0x1334)return target;
  return (current+(target<current?-0x1333:0x1333))|0;
}
//004E5F70 with real004EDA70 smoothing. Arsenal widget calls remain adapters.
export function nativeUpdateControllerPresentation(memory,sceneMemory,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength),scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const get=o=>body.getInt32(o,true),put=(o,v)=>body.setInt32(o,v,true),sg=o=>scene.getInt32(o,true),sp=(o,v)=>scene.setInt32(o,v,true);
  sp(0x12474,approach(sg(0x12474),sg(0x1246c),65536));sp(0x12478,approach(sg(0x12478),sg(0x12470),65536));
  put(0xd4,slide(get(0xd4),get(0xd8)));
  put(0xd0,get(0x40) && !get(0xd8) && (host.teamVisible(get(0x3c))&255) && host.teamIndicator(get(0x3c)) && !sg(0x1d444)?65536:0);
  put(0xcc,slide(get(0xcc),get(0xd0)));
  if(!get(0xe4))return;
  if(get(0xc8)) {
    const dimensions=host.arsenalMeasure();put(0xc0,dimensions[0]);put(0xc4,dimensions[1]);
    sp(0x12474,0);sp(0x12478,0);
    const position=host.arsenalLayout(0,0);sp(0x12474,position[0]<<16);sp(0x12478,position[1]<<16);
    sp(0x1246c,sg(0x12474));sp(0x12470,sg(0x12478));put(0xc8,0);
  }
  host.arsenalPosition(sg(0x12474)>>16,sg(0x12478)>>16);
  put(0x118,host.arsenalSelection());
}
