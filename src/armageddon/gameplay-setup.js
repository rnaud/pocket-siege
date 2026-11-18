import {nativeInitializeWeaponRecords} from './weapon-initialization.js';
import {nativeInitializeInventory} from './inventory-initialization.js';

//004A55D0..004A55E3 copies the frontend payload into scene+47A8.
//0049D454..0049D473 then initializes weapon records BEFORE importing inventory:
//mode filtering mutates the copied setup banks, not the frontend source.
//Scene allocation, map/resource construction and later task setup are separate.
export function nativeInitializeGameplayRecords(scene,frontend,localizedName) {
  scene.set(frontend.subarray(0x3c,0xdca0),0x47a8);
  nativeInitializeWeaponRecords(scene,localizedName);
  nativeInitializeInventory(scene.subarray(0x1b94,0x47a8),scene.subarray(0x47a8));
}
