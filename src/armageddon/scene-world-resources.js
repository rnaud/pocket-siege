import {nativePrepareSceneTerrain} from './scene-terrain.js';
import {nativeCreateSceneCollisionShapes} from './scene-collision-shapes.js';
import {nativeCreateSceneArrowShapes} from './scene-arrow-shapes.js';
import {nativeCreateSceneSpawnPool} from './scene-spawn-pool.js';
import {nativeAdvanceSceneLoading} from './scene-loading-progress.js';

//004A56BA..004A5B30: terrain, fixed shapes, arrows and spawn outputs share
//the original scene owner and caller scratch through the two progress updates.
export function nativeCreateSceneWorldResources(memory,owner,renderer,scratch,host) {
  const masks=nativePrepareSceneTerrain(memory,owner,renderer,scratch,host);
  nativeCreateSceneCollisionShapes(memory,owner,masks,host);
  nativeCreateSceneArrowShapes(memory,owner,host);
  nativeCreateSceneSpawnPool(memory,owner,scratch.positions,()=>memory.get(scratch.count)|0,host);
  nativeAdvanceSceneLoading(memory,owner,1,host);
  nativeAdvanceSceneLoading(memory,owner,1,host);
}
