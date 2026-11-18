import {nativeSetupMetadata} from './setup-metadata.js';
import {nativeExpandWeaponSettings} from './weapon-settings.js';
import {nativeExpandSchemeEnvironment} from './scheme-environment.js';
import {nativeResolveSetupSpeech} from './speech-setup.js';
import {nativePrepareInventoryScheme,nativeBuildInventorySetup} from './inventory-setup.js';
import {nativeBuildTeamSetup} from './team-setup.js';
import {nativeInitializeSetupTurnOrder} from './setup-turn-order.js';
import {nativeInitializeInventory} from './inventory-initialization.js';

//00415540. Team data begins at006DE000.
//Resource probing, profile storage and installed language use host interfaces.
export function nativeInitializeMatchSetup(memory,schemeState,teamData,host) {
  nativePrepareInventoryScheme(memory,schemeState);
  memory[0xd42a]=0;
  const scheme=schemeState.subarray(0x14,0xec);
  nativeBuildTeamSetup(memory,teamData.subarray(0x2000),scheme,host);
  if(host.speechFallback)host.speechFallback(memory,teamData);
  else nativeResolveSetupSpeech(memory,teamData,host);
  nativeInitializeSetupTurnOrder(memory,()=>host.random.nextSeed(host.seedStorage));
  const preset=new DataView(schemeState.buffer,schemeState.byteOffset,schemeState.byteLength).getInt32(8,true);
  nativeBuildInventorySetup(memory,scheme,preset,host.extras??[],{
    descriptors:host.descriptors,teamData,missingTeam:host.missingTeam,
  });
  nativeExpandWeaponSettings(memory,scheme);
  host.random.seed(host.seedStorage.time());
  nativeExpandSchemeEnvironment(memory,scheme,host.descriptors);
  return nativeSetupMetadata(memory,host);
}

//Match startup imports inventory only after setup returns. Mission loading
//uses00415540 alone, then applies its own options and team loadouts.
export function nativeBuildInitialMatchSetup(memory,inventory,schemeState,teamData,host) {
  const result=nativeInitializeMatchSetup(memory,schemeState,teamData,host);
  nativeInitializeInventory(inventory,memory.subarray(0x3c));
  return result;
}
