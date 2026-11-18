import { nativeEndTargeting } from './target-input.js';
import { nativeFindDefaultWeapon } from './default-weapon.js';

const view=memory=>new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
//004E6810 event431: record firing, multi-shot ammo and remaining-shot speech.
export function nativeControllerShot(memory,sceneMemory,payload,host) {
  const body=view(memory),p=view(payload),get=o=>body.getInt32(o,true);
  if(p.getInt32(0,true)!==get(0x3c))return;
  body.setInt32(0x50,1,true);
  if(p.getInt32(24,true) && p.getInt32(16,true)>1)host.consumeWeapon(get(0x3c),get(0x64));
  const fired=p.getInt32(8,true),total=p.getInt32(12,true);
  if(total>1) {
    const remaining=(total-fired)|0;
    const text=remaining===0?host.shotText(0x60):remaining<2?host.shotText(0x64):host.shotText(0x68,remaining);
    host.announce((get(0x54)+0x11)|0,text);
  }
  if(fired===total)nativeEndTargeting(memory,sceneMemory);
  host.forward(0x431,payload);
}

//004E6810 event432: choose the next weapon before settling the fired ammo.
export function nativeControllerPostShot(memory,sceneMemory,payload,host) {
  const body=view(memory),get=o=>body.getInt32(o,true),put=(o,v)=>body.setInt32(o,v,true);
  const team=get(0x3c),worm=get(0x4c);
  if(view(payload).getInt32(0,true)!==team)return;
  if(host.wormHealth(team,worm)<1)put(0x68,0);
  else if(!view(host.weaponDescriptor(get(0x64))).getInt32(0x4c,true))
    put(0x68,host.findDefaultWeapon?host.findDefaultWeapon(worm):nativeFindDefaultWeapon(memory,sceneMemory,worm,host));
  else put(0x68,host.weaponAvailable(team,get(0x64))?get(0x64):0);
  if(get(0x50)) {
    put(0x50,0);put(0xc8,1);
    host.weaponAvailable(team,get(0x64));host.consumeWeapon(team,get(0x64));host.weaponAvailable(team,get(0x64));
    put(0x64,0);
  }
  nativeEndTargeting(memory,sceneMemory);
  for(let offset=0x8c;offset<=0xa8;offset+=4)put(offset,0);
}

//004E6740: keep a pending selection while busy, then dispatch once available.
// The original declares292 bytes, but initializes only these first four words.
export function nativeControllerPendingWeapon(memory,host) {
  const body=view(memory),get=o=>body.getInt32(o,true),put=(o,v)=>body.setInt32(o,v,true);
  if(!get(0x40) || get(0x5c)){put(0x68,0);return;}
  if(!get(0x68) || host.wormBusy(get(0x3c),get(0x4c)))return;
  if(host.weaponAvailable(get(0x3c),get(0x68)))host.selectionCommand(get(0x3c),get(0x4c),get(0x68),0,0x124);
  put(0x68,0);
}
