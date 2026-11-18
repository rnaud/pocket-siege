import schemes from './crate-scheme-data.json' with { type: 'json' };
import { nativeCrateContentPool } from './crate-content-pool.js';

//Original built-in scheme expansion followed by004B90A0 and0049DB4F.
//Match/mission flags may override the captured zero-context baseline.
export function createNativeCrateScheme(resourceId, sceneOverrides={}) {
  const scheme=schemes.schemes.find(row=>row.resource_id===resourceId);
  if(!scheme)throw new RangeError(`Unknown native scheme resource ${resourceId}`);
  return {pool:nativeCrateContentPool([], {...scheme.scene,...sceneOverrides},slot=>scheme.descriptors[slot]),
    used:[],ammo:[...scheme.ammo]};
}
