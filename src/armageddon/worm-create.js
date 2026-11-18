import { nativeInitializePhysics } from './physics-create.js';
import { nativeInitializeWormResources } from './worm-resources.js';
//004D5A40 fixed initial fields, in native order around the gravity query.
const initial=[[0x144,0x0],[0x14c,0x0],[0x13c,0x0],[0x2dc,0x0],[0x2e0,0x0],[0x2e4,0x0],[0x2e8,0x0],[0x150,0x0],[0x194,0x0],[0x164,0x0],[0x154,0x0],[0x104,0x0],[0x108,0x0],[0x198,0x0],[0x1b4,0x0],[0x2f0,0x0],[0x140,0x0],[0x204,0x0],[0x1f0,0x0],[0x160,0x0],[0x1c4,0x0],[0x168,0x0],[0x16c,0x0],[0x18c,0x0],[0x19c,0x1],[0x200,0x10000],[0x1ec,0x800000],[0x190,0x21cce],[0x238,0x0],[0x23c,0x0],[0x240,0x0],[0x244,0x0],[0x234,0x0],[0x248,0x0],[0x24c,0x0],[0x250,0x0],[0x254,0x0],[0x258,0x0],[0x25c,0x0],[0x260,0x8000],[0x220,0x0],[0x224,0x0],[0x228,0x0],[0x22c,0x0],[0x230,0x0],[0x1c8,0x0],[0x1a0,0x0],[0x264,0x0],[0x268,0x0],[0x26c,0x0],[0x278,0x0],[0x270,0x0],[0x27c,0x0],[0x280,0x0],[0x284,0x8000],[0x20c,0x0],[0x2c4,0x0],[0x208,0x0],[0x1dc,0x0],[0x1e0,0x0],[0x1e4,0x0],[0x1e8,0x0],[0x274,0x1a4],[0x1bc,0x0],[0x1c0,0x0],[0x2b4,0x0],[0x294,0x0],[0x298,0xffffffff],[0x29c,0xffffffff],[0x2a0,0x0],[0x2a4,0x0],[0x2a8,0x0],[0x2ec,0x0],[0x2b0,0x1]];
const afterGravity=[[0x174,0x0],[0x170,0x0],[0x354,0x0],[0x2bc,0x0],[0x2c0,0x0],[0x2cc,0x0],[0x15c,0x0],[0x1cc,0x0],[0x1d0,0x0],[0x2d0,0x2],[0x2d4,0x0],[0x2fc,0x0],[0x2d8,0x3],[0x2f4,0x3c00000],[0x2f8,0x15c0000]];
const view=m=>new DataView(m.buffer,m.byteOffset,m.byteLength);
function copyString(destination,offset,source,start) {
  let end=start;while(source[end]!==0)end++;
  destination.set(source.subarray(start,end+1),offset);
}
// Fresh worm construction. Physics, placement, state-entry and resource methods
// remain explicit boundaries; this preserves native fields and call ordering.
export function nativeInitializeWorm(memory,sceneMemory,team,worm,configuration,host) {
  const body=view(memory),scene=view(sceneMemory),config=view(configuration);
  const put=(o,v)=>body.setInt32(o,v,true),get=o=>body.getInt32(o,true),sg=o=>scene.getInt32(o,true),sp=(o,v)=>scene.setInt32(o,v,true);
  if(host.initializePhysics)host.initializePhysics(2,3,18);
  else {nativeInitializePhysics(memory,sceneMemory,2,3,host);host.setTaskType(18);}
  const base=team*3000;put(0x138,+(scene.getInt8(base+0x3cd0)<0));memory.set(configuration.subarray(0,40),0x110);
  let deployment=!get(0x138) && scene.getUint8(0x11d3e)!==0,x,y;
  if(config.getUint8(0x1e)) {deployment=false;x=config.getInt32(0x20,true)<<16;y=config.getInt32(0x24,true)<<16;}
  else if(deployment){x=0x3c00000;y=-0x27100000;}
  else {
    const packed=scene.getUint8(0x11d51)?host.sideSpawn(scene.getUint8(base+0x3cd3)&1):host.randomSpawn(host.randomSpawnWord()>>>8);
    host.reserveSpawn(packed);x=packed&0xffff0000;y=packed<<16;
  }
  for(const [o,v] of initial)put(o,v);
  put(0x148,config.getUint16(0x1c,true));put(0xfc,team);put(0x100,worm);put(0x10c,scene.getUint8(base+0x3cd1));
  put(0x1ac,sg(0x7f0));put(0x1b0,x<0x3c00000?1:-1);put(0x1b8,get(0x1b0)<<16);
  put(0x2c8,((Math.imul((x>>16)+(y>>16),0x660d)&65535)%100)+200);
  const gravity=host.gravity();let distance=0,speed=0,next=gravity;
  while(next<0x80000){distance=(distance+speed)|0;speed=(speed+gravity)|0;next=(speed+gravity)|0;}
  put(0x1a8,distance>>16);
  for(const [o,v] of afterGravity)put(o,v);
  let slot=-1;
  if(sg(0xc28)) {
    sp(0xc28,(sg(0xc28)-1)|0);slot=sg(0x828+sg(0xc28)*4);
    sp(0x1030+slot*4,sg(0x102c));sp(0xc2c+sg(0x102c)*4,slot);sp(0x102c,(sg(0x102c)+1)|0);
  }
  put(0x158,slot);const rank=sg(0x1030+slot*4);
  if(rank) {
    for(let i=0;i<sg(0x102c);i++){const o=0x1030+sg(0xc2c+i*4)*4;if(sg(o)<rank)sp(o,(sg(o)+1)|0);}
    sp(0x1030+slot*4,0);
  }
  host.setWormBusy(team,worm,0);
  copyString(memory,0x304,configuration,3);copyString(memory,0x315,sceneMemory,base+0x3cd6);
  put(0x178,config.getUint16(0,true)<<16);put(0x17c,config.getUint16(0,true)<<16);
  for(const o of [0x180,0x184,0x188])put(o,0);
  const health=Math.max(0,Math.min(9999,host.wormHealth(team,worm)));
  memory.set(new TextEncoder().encode(String(health)+'\0'),0x326);
  put(0x288,0x420cc6);put(0x40,2);
  const place=()=>{if(host.placeWorm(x,y))return true;put(0x90,x);put(0x94,y);put(0xb8,0);return false;};
  place();put(0x40,get(0x288));put(0x78,0x9999);put(0x7c,0);
  put(0x60,Math.trunc(((Math.trunc(((x+y)|0)/256)|0)&65535)/20)+0xc000);
  put(0xb4,0x20000);put(0x4c,1);put(0x48,1);
  if(!deployment && (y>>16)<sg(0x804)) {
    do {if(place())break;y=(y+65536)|0;} while((y>>16)<sg(0x804));
  }
  const animation=host.allocateAnimation(0x164);put(0x350,animation?host.constructAnimation(animation,sg(8)):0);
  if(host.initializeResources)host.initializeResources();else nativeInitializeWormResources(memory,host.resources);
  host.changeState(deployment?100:101);
  if(deployment){put(0x210,1);put(0x54,1);}
  else {host.settlePhysics();put(0x210,0);}
  host.registerTask(2,((team<<4)+worm)|0);
}

import { nativeCreateTask, nativeRegisterTask } from './task-create.js';
import { nativeRegisterPhysicsTask } from './replay-physics.js';
// Logical actor factory: attach, initialize, join the environment, then register.
export function nativeCreateWorm({id,parent,memory=new Uint8Array(0x390),sceneMemory,environment,team,worm,configuration,host}) {
  let task;
  nativeInitializeWorm(memory,sceneMemory,team,worm,configuration,{
    ...host,
    initializePhysics:undefined,
    initializeTask:type=>{
      task=nativeCreateTask({id,parent,memory});task.type=type;
      const body=view(memory);body.setInt32(0x2c,type,true);body.setInt32(0x38,view(parent.memory).getInt32(0x38,true),true);
    },
    setTaskType:type=>{task.type=type;view(memory).setInt32(0x2c,type,true);},
    registerPhysics:()=>nativeRegisterPhysicsTask(task,environment),
    registerTask:(type,index)=>nativeRegisterTask(task,type,index),
  });
  return task;
}
