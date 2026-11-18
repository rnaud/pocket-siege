import { nativeCreateWorm } from './worm-create.js';
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
    constructWorm:host.constructWorm??((allocation,wormTeam,worm,record)=>nativeCreateWorm({id:allocation,parent:task,sceneMemory,environment:host.environment,team:wormTeam,worm,configuration:record,host:host.wormHost(allocation,wormTeam,worm)})),
    registerTask:(type,index)=>nativeRegisterTask(task,type,index),
  });
  return task;
}

import {nativeCreateTaskMemory,nativeRegisterTaskMemory} from './task-memory.js';
import {nativeCreatePanelText} from './panel-resources.js';
//Address-backed004E4ED0. Worm, portrait and frame constructors remain interfaces.
export function nativeCreateTeamControllerAt(memory,address,parent,team,configurationAddress,host) {
  const scene=memory.get(parent+0x38),sceneMemory=memory.range(scene,0x20000);
  nativeInitializeTeamController(memory.range(address,0x120),sceneMemory,team,memory.range(configurationAddress,3000),{
    initializeTask:type=>{
      nativeCreateTaskMemory(memory,address,parent,host);memory.put(address,0x5271b8);
      memory.put(address+0x2c,type);memory.put(address+0x38,scene);
    },
    allocateWorm:size=>host.allocate(size),
    constructWorm:(at,wormTeam,worm)=>host.call(0x4d5a40,at,[address,wormTeam,worm,configurationAddress+0xa74+(worm-1)*40]),
    setSelectedWeapon:(wormTeam,worm,value)=>memory.put(scene+0x1b94+wormTeam*0x51c+worm*0x9c-0x508,value),
    resources:{allocateResource:size=>host.allocate(size),context:scene,renderer:memory.get(scene+8),
      palette:Array.from({length:9},(_,i)=>memory.get(scene+0x12434+i*4)),
      constructPortrait:(at,...args)=>host.call(0x500170,at,args),
      constructFrame:(at,...args)=>host.call(0x4ffed0,at,args),
      constructText:(at,...args)=>nativeCreatePanelText(memory,at,...args,host),
    },
    registerTask:(type,index)=>nativeRegisterTaskMemory(memory,address,type,index,host),
  });
  return address;
}
