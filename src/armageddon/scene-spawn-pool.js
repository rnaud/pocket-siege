import {nativeCreatePanelImage} from './panel-resources.js';
import {nativeCreateSpawnPoolAt,nativeAddSpawnAt} from './spawn-pool.js';

//004A5A69..004A5B1E: working image and original64-entry spawn pool.
export function nativeCreateSceneSpawnPool(memory,owner,positions,count,host) {
  const image=host.allocate(44);
  if(image) {
    nativeCreatePanelImage(memory,image,256,480,8,host);
    memory.put(image,0x5249b0);
  }
  memory.put(memory.get(owner+0x5cd0)+0xac,image);
  const pool=host.allocate(16);
  const result=pool?nativeCreateSpawnPoolAt(memory,pool,64,host):0;
  memory.put(memory.get(owner+0x5cd0)+0x44c,result);
  for(let i=0;i<(count|0);i++) {
    const x=memory.get(positions+i*8),y=memory.get(positions+i*8+4);
    nativeAddSpawnAt(memory,memory.get(memory.get(owner+0x5cd0)+0x44c),((x<<16)+y)|0,1);
  }
}
