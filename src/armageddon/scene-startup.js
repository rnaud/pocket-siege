import {nativeCreateInitialSceneServices} from './scene-services.js';
import {nativeCreateInitialSceneBuffers} from './scene-buffers.js';
import {nativeCreateInitialSceneLayout} from './scene-layout.js';
import {nativeCreateOfflineScenePanels} from './scene-offline-panels.js';
import {nativeInitializeSceneDisplay} from './scene-display.js';
import {nativeInitializeSceneGameplayRecords} from './gameplay-setup.js';
import {nativeInitializeMatchState} from './match-state.js';
import {nativeFinalizeGameplaySetup} from './gameplay-finalize.js';

//0049CA90: complete offline initial scene setup, with external device/resource
//services supplied by host. Frontend payload and geometry are already installed.
export function nativeInitializeOfflineScene(memory,owner,scene,host,sharedCounter=new Uint8Array(4)) {
  if(memory.get(scene+0x20))throw new Error('Offline scene initialization requires no session device');
  nativeCreateInitialSceneServices(memory,owner,scene,host);
  nativeCreateInitialSceneBuffers(memory,owner,scene,host);
  nativeCreateInitialSceneLayout(memory,owner,scene,host);
  nativeCreateOfflineScenePanels(memory,owner,scene,host);
  nativeInitializeSceneDisplay(memory,scene,host);
  const bytes=memory.range(scene,0x20000);
  nativeInitializeSceneGameplayRecords(bytes,host.localizedName,sharedCounter);
  nativeInitializeMatchState(bytes,mode=>host.configureMode(memory.get(scene+0x24),mode));
  nativeFinalizeGameplaySetup(memory,owner,scene,host);
}
