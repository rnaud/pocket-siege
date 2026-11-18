import resources from './scheme-data.json' with {type:'json'};
import {nativePrepareInventoryScheme} from './inventory-setup.js';
import {nativeExpandWeaponSettings} from './weapon-settings.js';
import {nativeExpandSchemeEnvironment} from './scheme-environment.js';

// The settings window copied by the original setup into scene+11B9C.
// Read original resource bytes and execute the recovered builders, rather than
// using captured output as the live implementation. Descriptors supply the
// frontend handicap values; team/loadout state belongs to full match setup.
export function nativeExpandRuntimeScheme(payload,descriptors=new Uint8Array(0xd0)) {
  const memory=new Uint8Array(0x10000),state=new Uint8Array(0x1c4);
  state.set(payload,0x14);
  nativePrepareInventoryScheme(memory,state);
  const scheme=state.subarray(0x14,0xec);
  nativeExpandWeaponSettings(memory,scheme);
  nativeExpandSchemeEnvironment(memory,scheme,descriptors);
  return memory.slice(0xd430,0xd610);
}

export default {
  context_offset:0x11b9c,
  schemes:resources.schemes.map(({resource_id,language,bytes})=>({
    resource_id,language,bytes:nativeExpandRuntimeScheme(bytes),
  })),
};
