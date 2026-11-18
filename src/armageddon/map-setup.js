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
