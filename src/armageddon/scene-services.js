import {nativeCreatePanelImage} from './panel-resources.js';
import {nativeDestroyPanelImage} from './object-destroy.js';
import {nativeCreateEnvironmentMemory} from './physics-memory.js';
import {nativeDestroyEnvironmentMemory} from './physics-destroy.js';
import {nativeDestroyTeamPanelTree} from './team-panel-destroy.js';

//004CAD50: three owned images and the original byte-valued lookup table.
export function nativeCreateSceneImageManager(memory,address,width,height,host) {
  memory.put(address,0x526908);memory.put(address+4,width);memory.put(address+8,height);
  for(const offset of [16,20,24]) {
    const image=host.allocate(44);
    if(image){nativeCreatePanelImage(memory,image,width,height,8,host);memory.put(image,0x5249b0);}
    memory.put(address+offset,image);
  }
  memory.putByte(address+28,0);
  for(let index=1;index<0x8f8;index++)memory.putByte(address+28+index,Math.max(0,Math.trunc(index/9)-(index%9<6?1:0))&255);
  memory.put(address+0x914,0);memory.put(address+0x918,0);memory.put(address+12,0x12345678);return address;
}
//0049CA90..0049CB91: initial service allocation, before renderer dimensions.
export function nativeCreateInitialSceneServices(memory,owner,scene,host) {
  memory.put(owner+0x2a0,scene);memory.put(owner+0x290,(memory.byte(scene+0x11e78)<<24)>>24);
  const images=host.allocate(0x91c);memory.put(scene+0x7e0,images?nativeCreateSceneImageManager(memory,images,104,28,host):0);
  const commands=host.allocate(0x1100c);
  if(commands){memory.put(commands,0x526898);memory.put(commands+0x10008,0);memory.put(commands+4,0x10000);}
  memory.put(scene+0x7d0,commands);
  const environment=host.allocate(0x3c4);memory.put(scene+0x7d4,environment?nativeCreateEnvironmentMemory(memory,environment,scene,host):0);
  const manager=host.allocate(0x4a58);
  if(manager){memory.put(manager,0x5268b0);memory.put(manager+0x4a54,scene);}
  memory.put(scene+0x7d8,manager);
}
//Service destruction order at the end of0049DED0, after task destruction
//and environment compaction. Other owner/scene services are handled outside.
export function nativeDestroyInitialSceneServices(memory,scene,flags,host) {
  const environment=memory.get(scene+0x7d4);if(environment)nativeDestroyEnvironmentMemory(memory,environment,flags,host);
  const manager=memory.get(scene+0x7d8);
  if(manager){memory.put(manager,0x524a14);if(flags&1)host.release(manager,0x4a58);}
  const panels=memory.get(scene+0x7dc);if(panels)nativeDestroyTeamPanelTree(memory,panels,flags,host);
  const commands=memory.get(scene+0x7d0);
  if(commands){memory.put(commands,0x524a14);if(flags&1)host.release(commands,0x1100c);}
  const images=memory.get(scene+0x7e0);
  if(images) {
    memory.put(images,0x526908);
    for(const offset of [16,20,24]){const image=memory.get(images+offset);if(image)nativeDestroyPanelImage(memory,image,1,host);}
    memory.put(images,0x524a14);if(flags&1)host.release(images,0x91c);
  }
}
