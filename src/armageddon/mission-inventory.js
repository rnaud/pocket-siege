import fields from './mission-inventory-keys.json' with {type:'json'};

//00440470/00440510. Profile callbacks run before reading existing stock.
//Ammo adds signed-short quantities except for the -1 unlimited sentinel;
//delays always replace their short, including an absent (zero) value.
export function nativeLoadMissionWeapon(memory, owner, section, team, slot, key, delay, host) {
  const value=host.profileInt(section,key,0,memory.get(owner+0x880))|0;
  const address=((delay?0x6f36b2:0x6f3624)+Math.imul((Math.imul(team,143)+slot)|0,2))>>>0;
  let next=value;
  if(!delay) {
    const previous=memory.byte(address)|(memory.byte(address+1)<<8);
    if(previous===65535 || value===0)return;
    if(value!==-1)next=(previous+value)|0;
  }
  memory.putByte(address,next);
  memory.putByte(address+1,next>>>8);
}

//0043F2E0: exact original request ordering, including late utility entries.
//CString ownership is a platform boundary; section names are JS strings here.
export function nativeLoadMissionInventory(memory, owner, section, team, host) {
  for(const [kind,slot,key] of fields.entries)
    nativeLoadMissionWeapon(memory,owner,section,team,slot,key,kind==='delay',host);
}
