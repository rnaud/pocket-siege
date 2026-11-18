import {nativeCreatePanelImage,nativeCreatePanelText} from './panel-resources.js';
import {nativeInitializeMatchResources} from './match-resources.js';

//004C3A10. Any non-eliminated team with a state100 worm needs deployment.
export function nativeNeedsDeployment(inventory) {
  const view=new DataView(inventory.buffer,inventory.byteOffset,inventory.byteLength);
  for(let team=0;team<view.getInt32(0x1eb4,true);team++) {
    const base=team*0x51c;
    if(view.getInt32(base+0x510,true))continue;
    for(let worm=0;worm<view.getInt32(base+0x51c,true);worm++)
      if(view.getInt32(base+0x24+worm*0x9c,true)===100)return 1;
  }
  return 0;
}

//004B2AD0. World/task/actor construction004EAAD0 remains the host boundary.
export function nativeInitializeMatchRoot(memory,sceneMemory,setup,host) {
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const put=(offset,value)=>view.setInt32(offset,value,true);
  host.initializeWorld();put(0,0x526720);put(0x2c,6);put(0xe4,setup[0xde]);
  put(0xe8,(sceneMemory[0x11b96]<<24)>>24);
  for(let group=0;group<sceneMemory[0x114e0];group++)put(0xec+group*4,((sceneMemory[0x114e2+group*0x11e]<<24)>>24)+1);
  const deployment=nativeNeedsDeployment(sceneMemory.subarray(0x1b94));
  put(0x104,deployment);scene.setInt32(0x1b94+0x2c10,deployment,true);
  for(const index of [0x4f,0x52,0x66,0x81])put(index*4,1);
  for(const index of [0x4a,0x4b,0x4c,0x4d,0x4e,0x76,0x77,0x50,0x51,0x53,0x59,0x5b,0x5c,0x5d,0x62,0x61,0x54,0x55,0x56,0x58,0x67,0x57,0x7c,0x36,0x37,0x73,0x68,0x69,0x6a,0x6b,0x6c,0x6d,0x6e,0x6f,0x70,0x71,0x72,0x74,0x75,99,100,0x65,0x7d,0x7e,0x7f,0x80])put(index*4,0);
  put(0xe0,~((scene.getUint32(0x1acc,true)&65535)%9000));
  const duration=scene.getUint16(0x11d4a,true)*1000;put(0x180,duration);
  if(!duration&&!sceneMemory[0x11d5d])put(0x150,1);
  scene.setInt32(0x810,0,true);
  nativeInitializeMatchResources(memory,sceneMemory,host);
  const music=scene.getUint32(0x14,true);
  if(setup[0xd69c]&&music)host.startMusic(music,setup.subarray(0xd65c),setup[0xd69c]);
}

//Address-backed composition used by original startup finalization.
export function nativeCreateMatchRootAt(memory,address,scene,setup,host) {
  nativeInitializeMatchRoot(memory.range(address,0x28c),memory.range(scene,0x20000),memory.range(setup,0xdc64),{
    initializeWorld:()=>host.initializeWorld(address,scene,setup),
    allocateResource:size=>host.allocate(size),renderer:memory.get(scene+8),
    constructSurface:(at,...args)=>{nativeCreatePanelImage(memory,at,...args,host);memory.put(at,0x5249b0);},
    constructText:(at,...args)=>nativeCreatePanelText(memory,at,...args,host),
    startMusic:(at,data,count)=>host.startMusic(at,setup+0xd65c,count),
  });
  return address;
}
