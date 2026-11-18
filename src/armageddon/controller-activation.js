import { nativeAdvanceWeaponDelays } from './weapon-delays.js';
import { nativeAcquireInputOwner, nativeReleaseInputOwner } from './controller-ownership.js';
import { nativeSelectDefaultWeapon } from './default-weapon.js';

//004E6810 event41C. Task messages, delay expiry presentation, audio and AI
// construction are interfaces; controller fields and input ownership are native.
export function nativeControllerActivation(memory,sceneMemory,payload,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength),scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const get=o=>body.getInt32(o,true),put=(o,v)=>body.setInt32(o,v,true);
  if(new DataView(payload.buffer,payload.byteOffset,payload.byteLength).getInt32(0,true)!==get(0x3c))return;
  host.forward(0x412,payload);
  if(!get(0xe0))put(0xe0,1);
  put(0xac,0);put(0xbc,0);put(0x84,1);nativeReleaseInputOwner(body,scene,0xe8,0x1b778);put(0xf8,0);
  if(!host.matchMode(1))put(0x60,(get(0x60)+1)|0);
  host.selfEvent(0x440,0,null);put(0x40,1);
  host.sendWorm(2,((get(0x3c)<<4)+get(0x4c))|0,0x41c,payload);
  if(get(0x60)>1) {
    if(host.advanceWeaponDelays)host.advanceWeaponDelays();
    else nativeAdvanceWeaponDelays(memory,host);
  }
  if(scene.getInt8(0x11d7c)===get(0x44)) {
    put(0xf0,nativeAcquireInputOwner(scene,0x1b848));
    put(0xec,nativeAcquireInputOwner(scene,0x1b7e0));
    for(const offset of [0x108,0x8c,0x90,0x94,0x98,0x9c,0xa0,0xa4,0xa8])put(offset,0);
    if(get(0xf0)>=0 && !(scene.getInt16(0x1b8aa,true)>0 && scene.getInt16(0x1b88a,true)===get(0xf0)))host.repeatKey(0x1b);
  }
  if(host.selectDefaultWeapon)host.selectDefaultWeapon(get(0x4c));
  else nativeSelectDefaultWeapon(memory,sceneMemory,get(0x4c),host);
  put(0xc8,1);
  if(get(0x44)<0) {
    const allocation=host.allocateAI(0x2dd4);
    if(allocation)host.constructAI(allocation,get(0x3c),(-get(0x44))|0,get(0x88));
    put(0x88,Math.max(0,(get(0x88)-15)|0));put(0x58,1);
  } else {
    if(scene.getUint8(0x11d6a)) {
      host.sendTask(0x14,0,0x448,0,null);
      put(0x7c,scene.getUint8(0x11d6a)*1000);
    }
    const sound=host.teamSound(get(0x3c),0x37);host.sound(sound,3,65536,65536,0);
  }
}
