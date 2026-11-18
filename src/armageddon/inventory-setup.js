import tables from './inventory-setup-tables.json' with {type:'json'};

//00417750. Frontend setup before the +3C runtime copy and004C2640 import.
//Saved-team lookup and descriptor getters remain interfaces; setup bytes,
//signed short stockpiles and per-team bank assignment remain authoritative.
export function nativeBuildInventorySetup(memory, scheme, preset, extras, host) {
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const signedByte=value=>value<<24>>24;
  const round=(view.getInt32(0x38,true)+1)|0;view.setInt32(0x38,round,true);
  const delays=new Int16Array(71);
  for(const [slot,kind,value] of tables.delays)
    delays[slot]=kind==='getter'?host.delay(slot):kind==='byte'?signedByte(scheme[value]):value;
  if(memory[0xd5fb]===1)delays[55]=99;
  const overrides=[2,14,15].includes(preset)?[[62,2]]:preset===8?[[10,4],[30,2],[50,5]]:
    preset===9?[[31,7]]:preset===16?[[10,4]]:[];
  for(const [slot,value] of overrides)if(!host.count(slot))delays[slot]=value;
  for(let bank=0;bank<6;bank++)
    for(let slot=0;slot<71;slot++)view.setInt16(0xce06+bank*0x11e+slot*2,delays[slot],true);
  const copied=new Set();
  for(let team=0;team<memory[0x11a];team++) {
    if(memory[0x11e+team*3000])continue;
    const bank=view.getInt8(0x11f+team*3000),base=0xcd78+bank*0x11e;
    const get=slot=>view.getInt16(base+slot*2,true),set=(slot,value)=>view.setInt16(base+slot*2,value,true);
    if(!scheme[8])memory.fill(0,base,base+142);
    else if(round>1) {
      const saved=host.saved(team);
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
      const special=host.special(team);
      const bonus=[[44,1],[26,3],[53,1],[4,2],[5,1],[52,2],[43,1],[24,1]][special];
      if(bonus)set(bonus[0],get(bonus[0])+bonus[1]);
    }
  }
}
