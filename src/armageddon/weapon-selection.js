import { nativeArsenalOwnership } from './controller-input.js';
import { nativeApplyWeaponInputFlags } from './weapon-input-flags.js';
import { nativeBeginTargeting, nativeEndTargeting } from './target-input.js';
import { nativeClampPlacementTarget } from './target-placement.js';

// Complete event41B branch of004E6810. The underlying task dispatch remains
// a host interface; selection gates, descriptor modes and ownership are native.
export function nativeSelectWeaponEvent(memory,sceneMemory,payload,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const command=new DataView(payload.buffer,payload.byteOffset,payload.byteLength);
  const get=o=>body.getInt32(o,true),put=(o,v)=>body.setInt32(o,v,true);
  const team=command.getInt32(0,true),slot=command.getInt32(8,true);
  if(team!==get(0x3c) || !get(0x40) || get(0x48) || host.wormBusy(get(0x3c),get(0x4c)) || !host.weaponAvailable(get(0x3c),slot))return;
  const worm=host.lookup(2,((get(0x3c)<<4)+get(0x4c))|0);
  const info=host.wormQuery(worm,0x7d3,0x154),status=new DataView(info.buffer,info.byteOffset,info.byteLength);
  if(status.getInt32(0x20,true))return;
  if(get(0xe4)){nativeArsenalOwnership(body,scene,false);put(0xd8,0);}
  put(0x64,slot);
  const descriptor=host.weaponDescriptor(slot),view=new DataView(descriptor.buffer,descriptor.byteOffset,descriptor.byteLength);
  if(view.getInt32(0x4c,true))host.selectInventory(team,command.getInt32(4,true),slot);
  put(0x6c,0);
  if(!scene.getInt32(0x1d444,true)) {
    nativeApplyWeaponInputFlags(memory,descriptor);
    if(!get(0x70))put(0xf8,0);
    nativeEndTargeting(memory,sceneMemory);
    if((scene.getInt8(0x11d7c)===get(0x44) || get(0x44)>=0) && (get(0x94) || get(0x98)))nativeBeginTargeting(memory,sceneMemory,host);
    if([0x22,0x24].includes(get(0x64))) {
      const shape=host.targetShape(get(0xe0));
      const [x,y]=nativeClampPlacementTarget(scene.getInt32(0x1247c,true),scene.getInt32(0x12480,true),shape.width,shape.height,scene.getInt32(0x1b8ac,true));
      scene.setInt32(0x1247c,x,true);scene.setInt32(0x12480,y,true);
    }
  }
  host.forward(payload);
}
