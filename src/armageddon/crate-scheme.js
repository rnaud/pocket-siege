import settings from './scheme-runtime.js';
import {nativeBuildSchemeContext} from './scheme-weapons.js';
import {nativeCrateContentPool} from './crate-content-pool.js';

//Original scheme expansion,004B90A0 record initialization, then0049DB4F pool.
//Apply match flags before initialization so descriptor/eligibility reads share
//the same scene, rather than projecting flags onto a captured baseline.
export function createNativeCrateScheme(resourceId,sceneOverrides={}) {
  const scheme=settings.schemes.find(row=>row.resource_id===resourceId);
  if(!scheme)throw new RangeError(`Unknown native scheme resource ${resourceId}`);
  const memory=nativeBuildSchemeContext(scheme.bytes,sceneOverrides),view=new DataView(memory.buffer);
  const scene={specialWeapons:memory[0x11d57],environmentDisabled:memory[0x11d62],modeByte:memory[0x11d68],
    tall:view.getInt32(0x1b8ac,true),mode:view.getInt32(0x20,true)};
  return {pool:nativeCrateContentPool([],scene,slot=>view.getInt32(0x1260c+slot*0x208,true)),
    used:[],ammo:Array.from({length:71},(_,slot)=>view.getInt32(0x1bfb8+slot*4,true))};
}
