import {nativeCreateCollisionShape} from './collision-shape-create.js';

//004A59CF..004A5A69:32 arrow images and their owned collision silhouettes.
//Renderer palette and named archive loading are external resource services.
export function nativeCreateSceneArrowShapes(memory,owner,host) {
  for(let index=0;index<32;index++) {
    const name=`arrow${String(index).padStart(2,'0')}.img`,offset=index*4;
    const scene=memory.get(owner+0x5cd0),archive=memory.get(owner+0x2ac);
    const palette=host.getRendererPalette(memory.get(scene+8),1);
    const image=host.loadNamedArchiveImage(palette,archive,name);
    memory.put(scene+0x2c+offset,image);
    const shape=host.allocate(0x9c);
    if(shape) {
      const target=memory.get(owner+0x5cd0)+offset;
      const result=nativeCreateCollisionShape(memory,shape,[20,20,40,40,30,30],memory.get(target+0x2c),host);
      memory.put(target+0x3cc,result);
    } else memory.put(memory.get(owner+0x5cd0)+0x3cc+offset,0);
  }
}
