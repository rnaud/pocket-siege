// WA 3.0.0.0 runtime inventory primitives, verified against original x86.
// 004C2FB0: negative stock remains unchanged; negative additions grant -1.
export function addNativeAmmo(count, amount) {
  count |= 0;
  amount |= 0;
  return count < 0 ? count : amount < 0 ? -1 : (count + amount) | 0;
}
// 004C3010: only positive stock is decremented.
export function spendNativeAmmo(count) {
  count |= 0;
  return count > 0 ? count - 1 : count;
}
// 004C2EE0 ordinary-weapon path. Weapon 0x3B additionally checks live worms.
export function availableNativeAmmo(count, delay = 0, bypass = false) {
  return (delay | 0) !== 0 && !bypass ? 0 : count | 0;
}
// Bridge the existing browser inventory's Infinity representation. New native
// data may use negative counts directly; both must keep unlimited stock intact.
export const addAmmo = (count, amount) =>
  count === Infinity || amount === Infinity
    ? Infinity
    : addNativeAmmo(count ?? 0, amount);
export const spendAmmo = (count) =>
  count === Infinity ? Infinity : spendNativeAmmo(count ?? 0);
export const displayAmmo = (count) => (count < 0 ? Infinity : count);

//004C2EE0/004C2F70/004C2FB0/004C3010. Team+8 selects the shared inventory
//bank; team identity is not an ammo-array index. Memory starts at scene+1B94.
const inventoryView=memory=>new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
const ammoOffset=(view,team,slot)=>0x1eb8+((slot+Math.imul(view.getInt32(8+team*0x51c,true),0x8e))|0)*4;
export function nativeInventorySet(memory,team,slot,value) {
  const view=inventoryView(memory);view.setInt32(ammoOffset(view,team,slot),value,true);
}
export function nativeInventoryAdd(memory,team,slot,amount) {
  const view=inventoryView(memory),offset=ammoOffset(view,team,slot);
  view.setInt32(offset,addNativeAmmo(view.getInt32(offset,true),amount),true);
}
export function nativeInventorySpend(memory,team,slot) {
  const view=inventoryView(memory),offset=ammoOffset(view,team,slot);
  view.setInt32(offset,spendNativeAmmo(view.getInt32(offset,true)),true);
}
export function nativeInventoryAvailable(memory,team,slot) {
  const view=inventoryView(memory),offset=ammoOffset(view,team,slot);
  if(view.getInt32(offset+0x11c,true) && !view.getInt32(0x2c10,true))return 0;
  if(slot===59) {
    let alive=0;
    for(let i=0;i<view.getInt32(team*0x51c,true);i++)
      if(view.getInt32(team*0x51c-0x49c+i*0x9c,true)>0)alive++;
    if(alive<2)return 0;
  }
  return view.getInt32(offset,true);
}
