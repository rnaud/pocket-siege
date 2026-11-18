import {nativePrepareInventoryScheme,nativeBuildInventorySetup} from './inventory-setup.js';
import {nativeBuildTeamSetup} from './team-setup.js';
import {nativeInitializeSetupTurnOrder} from './setup-turn-order.js';
import {nativeInitializeInventory} from './inventory-initialization.js';

//00415540..004156DC followed by004C2640. Team data begins at006DE000.
//The remaining settings expansion and filesystem speech fallback are not
//implemented here; the latter is an explicit integration boundary.
export function nativeBuildInitialMatchSetup(memory,inventory,schemeState,teamData,host) {
  nativePrepareInventoryScheme(memory,schemeState);
  memory[0xd42a]=0;
  const scheme=schemeState.subarray(0x14,0xec);
  nativeBuildTeamSetup(memory,teamData.subarray(0x2000),scheme,host);
  host.speechFallback?.(memory,teamData);
  nativeInitializeSetupTurnOrder(memory,()=>host.random.nextSeed(host.seedStorage));
  const preset=new DataView(schemeState.buffer,schemeState.byteOffset,schemeState.byteLength).getInt32(8,true);
  nativeBuildInventorySetup(memory,scheme,preset,host.extras??[],{
    descriptors:host.descriptors,teamData,missingTeam:host.missingTeam,
  });
  nativeInitializeInventory(inventory,memory.subarray(0x3c));
}
