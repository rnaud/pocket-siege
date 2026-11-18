import {nativeCreateCollisionShape} from './collision-shape-create.js';
import {nativeDestroyBitmap8} from './bitmap-storage.js';

//004A5781..004A59CF: fixed scene collision shapes and terrain shape binding.
//The source image is released after all owned copies have been constructed.
export function nativeCreateSceneCollisionShapes(memory,owner,source,host) {
  memory.put(memory.get(owner+0x5cd0)+0x24,memory.get(owner+0x2b0));
  const regions=[
    [0x3b4,46,36,65,54,55,45], [0x3ac,45,7,52,12,48,9],
    [0x3b0,13,10,22,26,17,19], [0x3b8,0,32,24,61,12,51],
    [0x3bc,0,0,1,1,0,0], [0x3c4,371,9,472,27,418,3],
    [0x3c8,485,7,505,38,495,22], [0x3c0,45,7,46,8,45,7],
  ];
  for(const [slot,...region] of regions) {
    const shape=host.allocate(0x9c);
    const result=shape?nativeCreateCollisionShape(memory,shape,region,source,host):0;
    memory.put(memory.get(owner+0x5cd0)+slot,result);
  }
  const scene=memory.get(owner+0x5cd0);
  memory.put(scene+0x3a8,memory.get(memory.get(scene+0x24)+0xc4));
  if(source)nativeDestroyBitmap8(memory,source,1,host);
}
