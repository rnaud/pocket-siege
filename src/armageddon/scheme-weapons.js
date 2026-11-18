import settings from './scheme-runtime.js';
import {nativeInitializeWeaponRecords} from './weapon-initialization.js';

// Numeric live records are now built by the recovered initializer. Localization
// is supplied separately by the UI; it does not feed any numeric weapon field.
const empty=new Uint8Array(1);
export function nativeBuildSchemeWeapons(bytes) {
  const memory=new Uint8Array(0x20000),view=new DataView(memory.buffer);
  memory.set(bytes,settings.context_offset);
  nativeInitializeWeaponRecords(memory,()=>empty);
  return Array.from({length:71},(_,slot)=>Array.from({length:112},(_,field)=>
    view.getInt32(0x125bc+slot*0x208+0x48+field*4,true)));
}
export default {
  field_start:0x48,field_stride:4,
  schemes:settings.schemes.map(({resource_id,bytes})=>({resource_id,weapons:nativeBuildSchemeWeapons(bytes)})),
};
