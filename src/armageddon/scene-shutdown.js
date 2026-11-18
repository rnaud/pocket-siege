import {nativeReleasePriorityMemory} from './worm-destroy.js';
import {nativeCleanupTaskMemory,nativeVisitTaskDepth} from './task-memory.js';
import {nativeDestroyWorldTaskMemory} from './world-destroy.js';
import {nativeAppendSceneEvent,nativeDestroyInitialSceneBuffers} from './scene-buffers.js';
import {nativeDestroyInitialScenePools} from './scene-layout.js';
import {nativeDestroyOfflineScenePanels} from './scene-offline-panels.js';
import {nativeDestroyInitialSceneServices} from './scene-services.js';
import {nativeCompactPhysicsMemory} from './physics-memory.js';

//0049DED0. Complete shutdown for the offline scene's recovered task types.
export function nativeDestroyOfflineScene(memory,owner,host) {
  const scene=memory.get(owner+0x2a0);
  //These three resources belong to the excluded session-device panel branch.
  for(const offset of [12,16,20])if(memory.get(owner+offset))throw new Error('Session panels are outside offline scene ownership');
  for(const [field,base] of [[0x248,0x1b778],[0x24c,0x1b848],[0x20c,0x1b848]])
    nativeReleasePriorityMemory(memory,owner,field,base,base+32,base+34,base+66,base+98,false,scene);
  const root=memory.get(owner+4);
  if(root) {
    const cleanup=at=>{host.observeTaskCleanup?.(at);nativeCleanupTaskMemory(memory,at,host.cleanupChild??cleanup);};
    const depth=(at,n)=>{host.observeTaskDepth?.(at,n);nativeVisitTaskDepth(memory,at,n,host.visitChildDepth??depth);};
    cleanup(root);depth(memory.get(owner+4),0);
    const current=memory.get(owner+4);if(current)nativeDestroyWorldTaskMemory(memory,current,1,host);
  }
  if((memory.get(owner+0x290)|0)>0) {
    const value=memory.get(owner+0x280),payload=new Uint8Array(4);
    new DataView(payload.buffer).setUint32(0,value,true);
    nativeAppendSceneEvent(memory,memory.get(owner+0x38),0x3fe,payload);
    host.flushSceneEvents(owner,memory.get(owner+0x38));
  }
  nativeDestroyInitialSceneBuffers(memory,owner,1,host);
  nativeDestroyInitialScenePools(memory,owner,1,host);
  nativeDestroyOfflineScenePanels(memory,owner,1,host);
  nativeCompactPhysicsMemory(memory,memory.get(scene+0x7d4));
  nativeDestroyInitialSceneServices(memory,scene,1,host);
}
