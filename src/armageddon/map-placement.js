import { NativeMapPalette } from "./map-palette.js";
import { NativeGamePalette } from "./game-palette.js";
import { nativeImagePaletteMap, imageRGBA } from "./image.js";
import { nativeGenerateMapSetup } from "./map-setup.js";
import { nativeSelectSpawn, nativeReserveSpawn, nativeSpawnRandom } from "./spawn-pool.js";

// Adapt imported bitmap layers to Landgen's positive-down coordinates. Keep
// its palette distinct from the game's palette used for final sprite display.
export function originalMapSpawns(terrain,waterLevel,count,seed,theme) {
  const {width,height}=terrain,palette=new NativeMapPalette();
  const color=palette.remap({width,height,pixels:terrain.sourcePixels,palette:terrain.sourcePalette});
  const translation=new Uint8Array(256);
  for(const index of theme.palette.used)translation[index]=palette.add(theme.palette.colors[index]);
  const platform={...theme.platform,pixels:theme.platform.pixels.map(index=>translation[index])};
  const solid={width,height,depth:1,pixels:terrain.sourcePixels.map(index=>Number(index!==0))};
  const layers={color,solid,back:{...solid,pixels:solid.pixels.slice()}};
  const sceneMemory=new Uint8Array(0x12420);
  new DataView(sceneMemory.buffer).setUint32(0x1241c,seed,true);
  let landgenSeed=seed>>>0;
  const setup=nativeGenerateMapSetup(layers,{
    water:Math.round(waterLevel*100/height),requested:count,
    platform,rimColor:translation[theme.rimColor],
  },()=>landgenSeed=(Math.imul(landgenSeed,0x19660d)+0x3c6ef35f)>>>0,
  {count:0,reserve:count},sceneMemory);
  const spawns=[];
  for(let i=0;i<count;i++) {
    const output={value:0};
    if(!nativeSelectSpawn(setup.spawnPool,nativeSpawnRandom(sceneMemory)>>>8,output))
      throw new Error(`No native spawn candidate in ${terrain.id}`);
    nativeReserveSpawn(setup.spawnPool,output.value);
    spawns.push({x:output.value>>16,y:height-(output.value&65535)});
  }
  // Publish native fallback cuts/platforms to both collision and visible art.
  terrain.sourcePixels=color.pixels;terrain.sourcePalette=palette.rgba();
  const image={width,height,pixels:color.pixels,palette:terrain.sourcePalette};
  terrain.nativePalette=new NativeGamePalette(137,248);
  terrain.nativePaletteMapping=nativeImagePaletteMap(image,terrain.nativePalette);
  terrain.pixels=imageRGBA(image,true,{mapping:terrain.nativePaletteMapping,colors:terrain.nativePalette.colors});
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)
    terrain.data[(height-1-y)*width+x]=solid.pixels[y*width+x];
  terrain.nativeSpawnSetup={points:setup.points,landgenSeed,spawnSeed:new DataView(sceneMemory.buffer).getUint32(0x1241c,true)};
  return spawns;
}
