import { nativeInitializeControllerResources } from './controller-resources.js';
import { nativeEndTargeting } from './target-input.js';

//004E4ED0: base task allocation and actor constructors are host interfaces.
export function nativeInitializeTeamController(memory,sceneMemory,team,configuration,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength),scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength),config=new DataView(configuration.buffer,configuration.byteOffset,configuration.byteLength);
  const put=(o,v)=>body.setInt32(o,v,true);
  host.initializeTask(10);
  put(0x3c,team);put(0x44,config.getInt8(0));
  for(const o of [0x40,0x60,0x50,0x48,0x68,0x4c,0x64,0x5c,0x7c,0x58,0x88,0x84,0x6c,0x70,0x74,0x78])put(o,0);
  put(0x54,scene.getUint8(team*3000+0x3cd1));
  for(let worm=1;worm<=config.getUint8(0xbb4);worm++) {
    const allocation=host.allocateWorm(0x390);
    if(allocation)host.constructWorm(allocation,team,worm,configuration.subarray(0xa74+(worm-1)*40,0xa74+worm*40));
    host.setSelectedWeapon(team,worm,0);
  }
  if(host.initializeResources)host.initializeResources();else nativeInitializeControllerResources(memory,host.resources);
  nativeEndTargeting(memory,sceneMemory);
  host.registerTask(0x15,team);
}

import { nativeCreateTask, nativeRegisterTask } from './task-create.js';
// Fresh controllers now attach and register through the native logical task tree.
export function nativeCreateTeamController({id,parent,memory=new Uint8Array(0x120),sceneMemory,team,configuration,host}) {
  let task;
  nativeInitializeTeamController(memory,sceneMemory,team,configuration,{
    ...host,
    initializeTask:type=>{
      task=nativeCreateTask({id,parent,memory});task.type=type;
      const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength),parentView=new DataView(parent.memory.buffer,parent.memory.byteOffset,parent.memory.byteLength);
      view.setInt32(0x2c,type,true);view.setInt32(0x38,parentView.getInt32(0x38,true),true);
    },
    registerTask:(type,index)=>nativeRegisterTask(task,type,index),
  });
  return task;
}
