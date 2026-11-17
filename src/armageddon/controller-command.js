import { nativeControllerDeactivation } from "./controller-deactivation.js";
import { nativeSelectWeaponEvent } from './weapon-selection.js';

//004E6810 command branches. Return false for events whose lifecycle handler
// has not been ported here; a rejected, recognized command is still handled.
export function nativeControllerCommand(memory,sceneMemory,event,payload,host) {
  if(nativeControllerDeactivation(memory,sceneMemory,event,payload,host))return true;
  if(event===0x41b) {
    nativeSelectWeaponEvent(memory,sceneMemory,payload,{...host,forward:p=>host.forward(event,p)});
    return true;
  }
  if(![0x3f9,0x3fa,0x3fb,0x411,0x413,0x417,0x418,0x419,0x41a].includes(event) && !(event>=0x406 && event<=0x40f))return false;
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const p=new DataView(payload.buffer,payload.byteOffset,payload.byteLength);
  const get=o=>body.getInt32(o,true),put=(o,v)=>body.setInt32(o,v,true);
  if(p.getInt32(0,true)!==get(0x3c))return true;
  if(event===0x3f9) {
    scene.setInt32(0x1247c,p.getInt32(4,true)<<16,true);
    scene.setInt32(0x12480,p.getInt32(8,true)<<16,true);put(0xb8,1);
  } else if(event===0x3fa)put(0xe0,p.getInt32(4,true));
  else if(event===0x3fb){put(0xdc,p.getInt32(4,true));put(0xb4,p.getInt32(4,true)<<13);}
  else if(event===0x411)host.forward(event,payload);
  else if(event===0x413){host.resetTeam(get(0x3c));host.forward(event,payload);}
  else if(event>=0x406 && event<=0x40f) {
    if(!get(0x48) && get(0x40)) {
      if(event===0x40e)put(0x58,0);
      host.sendWorm(2,((get(0x3c)<<4)+get(0x4c))|0,event,payload);
    }
  } else if(event>=0x417 && event<=0x419) {
    if(!get(0x48) && get(0x40) && !host.wormBusy(get(0x3c),get(0x4c)))host.forward(event,payload);
  } else if(event===0x41a && get(0x4c)===p.getInt32(4,true) && !get(0x48) && get(0x40)) {
    const x=p.getInt16(8,true)<<16,y=p.getInt16(10,true)<<16;
    if([0,0x22,0x24,0x28,0x36].includes(get(0x64))) {
      if(host.teamVisible(get(0x3c)) || !(host.teamFlags(get(0x3c))&8))
        host.targetEffect(0,x,y,0,0,0,0,0,(get(0x54)+0x30a)|0,0,65536,0xccc);
    } else {put(0xfc,x);put(0xf8,1);put(0x100,y);}
    host.forward(event,payload);
  }
  return true;
}
