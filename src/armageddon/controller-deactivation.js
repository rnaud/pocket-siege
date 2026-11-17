import { nativeAcquireInputOwner, nativeReleaseInputOwner } from './controller-ownership.js';

//004E6810 events41D/41E/41F: input blocking, resumption and deactivation.
export function nativeControllerDeactivation(memory,sceneMemory,event,payload,host) {
  if(![0x41d,0x41e,0x41f].includes(event))return false;
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength),scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const get=o=>body.getInt32(o,true),put=(o,v)=>body.setInt32(o,v,true);
  if(new DataView(payload.buffer,payload.byteOffset,payload.byteLength).getInt32(0,true)!==get(0x3c))return true;
  const send=()=>host.sendWorm(2,((get(0x3c)<<4)+get(0x4c))|0,event,payload);
  const release=(offset,base)=>nativeReleaseInputOwner(body,scene,offset,base);
  if(event===0x41d) {
    send();put(0xd8,0);put(0xe4,0);put(0x48,1);release(0xf4,0x1b778);return true;
  }
  if(event===0x41e) {
    send();put(0x48,0);
    if(scene.getInt8(0x11d7c)===get(0x44)) {
      if(get(0xf0)<0) {
        put(0xf0,nativeAcquireInputOwner(scene,0x1b848));
        for(const offset of [0x108,0x8c,0x90,0x94,0x98,0x9c,0xa0,0xa4,0xa8])put(offset,0);
        if(get(0xf0)>=0 && !(scene.getInt16(0x1b8aa,true)>0 && scene.getInt16(0x1b88a,true)===get(0xf0)))host.repeatKey(0x1b);
      }
      if(get(0xec)<0)put(0xec,nativeAcquireInputOwner(scene,0x1b7e0));
    }
    return true;
  }
  if(get(0x44)<0 && get(0x58))put(0x88,Math.min((get(0x88)+40)|0,100));
  if(host.wormState(get(0x3c),get(0x4c))!==0x89)send();
  put(0x40,0);put(0x48,0);host.setTeamState(get(0x3c),0);
  if(get(0x50)) {
    put(0x50,0);put(0xc8,1);
    host.weaponAvailable(get(0x3c),get(0x64));host.consumeWeapon(get(0x3c),get(0x64));host.weaponAvailable(get(0x3c),get(0x64));put(0x64,0);
  }
  release(0xf0,0x1b848);release(0xec,0x1b7e0);
  for(const offset of [0x64,0x68,0x5c,0xac,0xbc])put(offset,0);
  release(0xe8,0x1b778);put(0xd8,0);put(0xe4,0);release(0xf4,0x1b778);
  if(!get(0x70))put(0xf8,0);
  if(get(0x7c)){put(0x7c,0);host.sendTask(0x14,0,0x449,0,null);}
  host.releaseCamera(2);
  const actor=host.lookup(0x12,get(0x3c));if(actor)host.destroyActor(actor,1);
  return true;
}
