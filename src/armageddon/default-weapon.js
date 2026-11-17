import { nativeWeaponInputFlags } from './weapon-input-flags.js';

const view=memory=>new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
//004E55D0 retains native repeated descriptor/availability queries and scan order.
export function nativeFindDefaultWeapon(memory,sceneMemory,worm,host) {
  const body=view(memory),scene=view(sceneMemory),team=body.getInt32(0x3c,true);
  const saved=scene.getUint32(0x4730+((Math.imul(team,75)+worm)|0)*40,true);
  if(saved && body.getInt32(0x44,true)<0)return host.weaponAvailable(team,saved)?saved:0;
  const get=(slot,offset)=>view(host.weaponDescriptor(slot)).getInt32(offset,true);
  const untargeted=slot=>{const flags=nativeWeaponInputFlags(host.weaponDescriptor(slot));return !flags[2] && !flags[3];};
  if([0x78,0x7b,0x7c,0x7d].includes(host.wormState(team,worm))) {
    for(let slot=1;slot<71;slot++)if(get(slot,0x68)===2 && host.weaponAvailable(team,slot) && get(slot,0x4c) && untargeted(slot))return slot;
    for(let slot=1;slot<71;slot++)if(get(slot,0x68)===2 && host.weaponAvailable(team,slot) && untargeted(slot))return slot;
  }
  if(host.teamFlags(team)&4) {
    for(let slot=1;slot<71;slot++) {
      const descriptor=view(host.weaponDescriptor(slot));
      if(descriptor.getInt32(0x68,true)===1 && [2,4].includes(descriptor.getInt32(0x70,true)) && host.weaponAvailable(team,slot) && get(slot,0x4c) && untargeted(slot))return slot;
    }
  }
  for(let slot=1;slot<71;slot++)if(host.weaponAvailable(team,slot) && get(slot,0x4c) && untargeted(slot))return slot;
  return 0;
}

//004E54D0. Only the first16 bytes of the declared124-byte native command are
// initialized. Pass defined fields and declared size to the dispatch adapter.
export function nativeSelectDefaultWeapon(memory,sceneMemory,worm,host) {
  const body=view(memory),team=body.getInt32(0x3c,true),current=body.getInt32(0x4c,true);
  let slot;
  if(host.wormState(team,current)===100){slot=40;host.setWeaponAmmo(team,40,1);}
  else {
    slot=host.selectedWeapon(team,current);
    if(slot && !view(host.weaponDescriptor(slot)).getInt32(0x4c,true))slot=0;
  }
  if(slot && !host.weaponAvailable(team,slot))slot=0;
  if(!slot)slot=nativeFindDefaultWeapon(memory,sceneMemory,worm,host);
  host.selectInventory(team,current,slot);
  if(slot)host.selectionCommand(team,current,slot,0,0x124);
  return slot;
}
