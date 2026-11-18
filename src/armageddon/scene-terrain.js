import {nativeCreatePanelImage} from './panel-resources.js';
import {nativeCreateTerrain} from './terrain-startup.js';

//004A56BA..004A5781. Caller-owned scratch survives into collision-shape and
//spawn-pool construction. Named image loading remains an archive service.
export function nativePrepareSceneTerrain(memory,owner,renderer,scratch,host) {
  const image=host.allocate(44);
  if(image) {
    nativeCreatePanelImage(memory,image,1920,696,1,host);
    memory.put(image,0x526328);
  }
  memory.put(memory.get(owner+0x5cd0)+0x2f4,image);
  const masks=host.loadNamedImage(scratch.palette,memory.get(owner+0x2ac),'masks.img');
  const terrain=host.allocate(0xb2c);
  let result=0;
  if(terrain) {
    const scene=memory.get(owner+0x5cd0);
    const settings={maskImage:masks,renderer,mode:1,path:scene+0x11e48,
      count:scratch.count,positions:scratch.positions,metadata:scene+0x1b8ac,water:scene+0x1b8b0};
    result=host.createTerrain
      ?host.createTerrain(terrain,settings)
      :nativeCreateTerrain(memory,terrain,settings,scratch.terrainScratch,host);
  }
  memory.put(owner+0x2b0,result);
  return masks;
}
