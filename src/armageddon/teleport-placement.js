import { nativeWormQuery } from './worm-query.js';
import { nativeTryBodyPosition } from './motion.js';
import { nativeFindTeleportTarget } from './target-placement.js';

// Compose004DF270 with the original position/mode accessors and004D1260.
// The collision-manager predicate returns a hit ID; placement returns clear.
export function nativeTeleportPlacement(memory,x,y,ceiling,collide) {
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const get=offset=>view.getInt32(offset,true),set=(offset,value)=>view.setInt32(offset,value,true);
  const host={
    position:()=>[get(0x90),get(0x94)],mode:()=>get(0x40),setMode:value=>set(0x40,value),
    place:(px,py)=>{
      const body={x:get(0x90),y:get(0x94),flags:get(0x40),sleeping:get(0xb8),shape:3};
      const result=nativeTryBodyPosition(body,px,py,(tx,ty)=>collide(body,tx,ty));
      if(result.result) {set(0x90,result.x);set(0x94,result.y);set(0xb8,result.sleeping);}
      return result.result;
    },
  };
  return nativeFindTeleportTarget(x,y,ceiling,(event,payload)=>nativeWormQuery(memory,event,payload.length,payload,host));
}
