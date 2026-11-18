import tables from './inventory-setup-tables.json' with {type:'json'};

//0046F4E0 /00470340 /00470370. First matching override wins.
export function nativeSetupWeaponValue(memory, slot, delay=false) {
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  for(let i=0;i<22;i++) {
    const offset=0xd0+i*12;
    if(view.getInt32(offset,true)===(slot|0))return view.getInt32(offset+(delay?8:4),true);
  }
  return 0;
}

//00476070 uses a 16-byte name comparison;0041B760 uses the complete
//NUL-terminated name. Both scan six records and skip inactive entries.
export function nativeFindSetupTeam(data, name, special=false) {
  const start=special?0x379f:0xc30,stride=special?0xd7b:0x39c;
  for(let team=0;team<6;team++) {
    const record=start+team*stride;
    if(!data[record+(special?0x121:0x11)])continue;
    let i=0;
    while(i<(special?name.length:16)) {
      if(data[record+i]!==name[i])break;
      if(!name[i])return team;
      i++;
    }
    if(!special && i===16)return team;
  }
  return -1;
}

//Global team data window begins at006DE000, including saved inventory.
export function nativeSetupSavedAmmo(data,name,missingTeam) {
  const index=nativeFindSetupTeam(data,name);
  if(index===-1)missingTeam?.();
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
  return Array.from({length:71},(_,slot)=>view.getInt16(0x508+index*0x8e+slot*2,true));
}
export function nativeSetupSpecial(data,name) {
  const index=nativeFindSetupTeam(data,name,true);
  return index===-1?-1:data[0x38c1+index*0xd7b];
}

//00417750. Frontend setup before the +3C runtime copy and004C2640 import.
//Saved-team and descriptor reads default to the recovered memory lookups; setup bytes,
//signed short stockpiles and per-team bank assignment remain authoritative.
export function nativeBuildInventorySetup(memory, scheme, preset, extras, host) {
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const signedByte=value=>value<<24>>24;
  const round=(view.getInt32(0x38,true)+1)|0;view.setInt32(0x38,round,true);
  const delays=new Int16Array(71);
  const delay=host.delay??(slot=>nativeSetupWeaponValue(host.descriptors,slot,true));
  const count=host.count??(slot=>nativeSetupWeaponValue(host.descriptors,slot));
  for(const [slot,kind,value] of tables.delays)
    delays[slot]=kind==='getter'?delay(slot):kind==='byte'?signedByte(scheme[value]):value;
  if(memory[0xd5fb]===1)delays[55]=99;
  const overrides=[2,14,15].includes(preset)?[[62,2]]:preset===8?[[10,4],[30,2],[50,5]]:
    preset===9?[[31,7]]:preset===16?[[10,4]]:[];
  for(const [slot,value] of overrides)if(!count(slot))delays[slot]=value;
  for(let bank=0;bank<6;bank++)
    for(let slot=0;slot<71;slot++)view.setInt16(0xce06+bank*0x11e+slot*2,delays[slot],true);
  const copied=new Set();
  for(let team=0;team<memory[0x11a];team++) {
    if(memory[0x11e+team*3000])continue;
    const bank=view.getInt8(0x11f+team*3000),base=0xcd78+bank*0x11e;
    const get=slot=>view.getInt16(base+slot*2,true),set=(slot,value)=>view.setInt16(base+slot*2,value,true);
    if(!scheme[8])memory.fill(0,base,base+142);
    else if(round>1) {
      const saved=host.saved?host.saved(team):nativeSetupSavedAmmo(host.teamData,memory.subarray(0x122+team*3000),host.missingTeam);
      if(!copied.has(bank)) {
        copied.add(bank);for(let slot=0;slot<71;slot++)set(slot,saved[slot]);
      }
    }
    if(scheme[8]===2 && round>1)continue;
    for(const [slot,index] of tables.ammo) {
      if(index===-2)set(slot,-1);
      else if(index!==-1 && get(slot)!==-1) {
        const value=signedByte(scheme[0x24+index*4]);set(slot,value===10?-1:get(slot)+value);
      }
    }
    for(const [slot,value] of tables.presets[preset]??[])if(get(slot)!==-1)set(slot,get(slot)+value);
    for(const [slot,value] of extras)if(get(slot)!==-1)set(slot,value===-1?-1:get(slot)+value);
    if(scheme[0x22]===1) {
      const special=host.special?host.special(team):nativeSetupSpecial(host.teamData,memory.subarray(0x122+team*3000));
      const bonus=[[44,1],[26,3],[53,1],[4,2],[5,1],[52,2],[43,1],[24,1]][special];
      if(bonus)set(bonus[0],get(bonus[0])+bonus[1]);
    }
  }
}
