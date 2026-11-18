import schemes from "./scheme-runtime.js";
import { nativeGenerateMapCandidates } from "./map-generation.js";
import { nativeBuildSpawnPool, nativeSpawnRandom } from "./spawn-pool.js";
import { nativeMapObjects } from "./map-objects.js";

// WA004A5350 builds the pool from Landgen's ordered coordinate records;
//004EBA80 consumes natural-object positions before worm constructors use it.
export function nativePrepareMapSpawns(positions,settings,sceneMemory) {
  const {calls,remaining}=nativeMapObjects(
    nativeBuildSpawnPool(positions),settings,()=>nativeSpawnRandom(sceneMemory),
  );
  return {objects:calls,spawnPool:remaining};
}

// Landgen and WA own separate setup random streams. Generation mutates the
// supplied terrain layers (including native fallback carving). Object creation
// requests still require the caller's mine/barrel factories and settling pass.
export function nativeGenerateMapSetup(layers,generation,landgenRandom,objects,sceneMemory) {
  const candidates=nativeGenerateMapCandidates(layers,generation,landgenRandom);
  return {...candidates,...nativePrepareMapSpawns(candidates.points,objects,sceneMemory)};
}

// Default resource195 expanded by00415540. Builder d430 maps to scene11B9C;
// natural count/fuse at d5a7/d5a6 therefore become11D13/11D12.
const defaultScheme=schemes.schemes.find(s=>s.resource_id===195).bytes;
const setting=offset=>defaultScheme[offset-schemes.context_offset];
export const nativeDefaultMapObjects=Object.freeze({
  count:setting(0x11d13),fuse:(setting(0x11d12)<<24)>>24,
  kind:setting(0x11d50),edges:setting(0x11d51),
});
