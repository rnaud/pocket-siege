import { nativeSpecialCrateContent } from './crate-draw.js';

//004C23E0. Availability here is independent of inventory count and delay.
// Inputs preserve raw native scheme bytes and descriptor offset+10C.
export function nativeCrateContentAllowed(slot, scene, descriptor) {
  if(nativeSpecialCrateContent(slot) && !(scene.specialWeapons&255))return false;
  if(scene.tall && !descriptor)return false;
  if([10,55,56].includes(slot) && (scene.environmentDisabled&255))return false;
  if(slot===54 && (scene.modeByte&255))return false;
  if(slot===66 && !scene.mode)return false;
  return true;
}

//0049DB4F..0049DB9A. Each eligible slot is inserted once, in slot order.
// Existing entries remain intact and the original71-entry capacity is honored.
export function nativeCrateContentPool(initial, scene, descriptor) {
  const pool=[...initial];
  for(let slot=1;slot<71;slot++)
    if(nativeCrateContentAllowed(slot,scene,descriptor(slot)) && pool.length<71)pool.push(slot);
  return pool;
}
