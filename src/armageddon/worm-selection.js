import { nativeSelectDefaultWeapon } from "./default-weapon.js";
import { nativeEndTargeting } from './target-input.js';

//004E5A50 resets input modes and transfers the selected worm. Actor messages
// and voice remain interfaces; default-weapon selection uses the native port.
export function nativeSelectControllerWorm(memory,sceneMemory,next,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const get=o=>body.getInt32(o,true),put=(o,v)=>body.setInt32(o,v,true);
  for(const offset of [0x108,0x8c,0x90,0x94,0x98,0x9c,0xa0,0xa4,0xa8])put(offset,0);
  if(get(0xf0)>=0 && !(scene.getInt16(0x1b8aa,true)>0 && scene.getInt16(0x1b88a,true)===get(0xf0)))host.repeatKey(0x1b);
  nativeEndTargeting(memory,sceneMemory);put(0xf8,0);
  if(next!==get(0x4c) && get(0x40)) {
    host.sendWorm(2,((get(0x3c)<<4)+get(0x4c))|0,0x41f,0,null);
    put(0x4c,next);
    host.sendWorm(2,((get(0x3c)<<4)+next)|0,0x41c,0,null);
    host.selectionSound(0x76,8,65536,65536,0);
    if(host.selectDefaultWeapon)host.selectDefaultWeapon(get(0x4c));
    else nativeSelectDefaultWeapon(memory,sceneMemory,get(0x4c),host);
  } else put(0x4c,next);
}
