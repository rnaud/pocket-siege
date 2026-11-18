import {nativeCreatePhysicsAt} from './physics-memory.js';
import {nativeRegisterTaskMemory} from './task-memory.js';
import {nativeQueryCollisionMemory} from './collision-registry.js';
import {nativeInitializeReplayPresentation} from './replay-presentation-restore.js';

//004D1F80 with shared004D21C0/004D2770/004D2050 resource initialization.
export function nativeCreateLandscapeAt(memory,address,parent,host) {
  nativeCreatePhysicsAt(memory,address,parent,1,1,host);
  memory.put(address,0x526ad0);memory.put(address+0x2c,28);
  for(const [offset,value] of [[0x104,0],[0xfc,1920],[0x100,696],[0x108,0]])memory.put(address+offset,value);
  const scene=memory.get(address+0x38),source=memory.get(scene+0x28),surface=memory.get(scene+0x2f0);
  let sourceDimensions,surfaceDimensions;
  nativeInitializeReplayPresentation(memory.range(address,0x175c),{
    paletteSource:{get height(){return (sourceDimensions??=host.surfaceDimensions(source))[1];},readPixel:(x,y)=>host.readSurfacePixel(source,x,y)},
    weather:{lowDetail:memory.get(scene+0x1b8ac),left:memory.get(scene+0x1b8cc)|0,right:memory.get(scene+0x1b8d0)|0,height:memory.get(scene+0x804)|0},
    palette:Array.from({length:10},(_,i)=>memory.get(scene+0x12434+i*4)),
    surface:{get width(){return (surfaceDimensions??=host.surfaceDimensions(surface))[0];},get height(){return surfaceDimensions[1];},draw:(method,...args)=>host.drawSurface(surface,method,args)},
  });
  if(!nativeQueryCollisionMemory(memory,memory.get(scene+0x7d4),address,0,0,memory.get(address+0xf0),memory.get(address+0x40),host.collisionOverlap))
    for(const offset of [0x90,0x94,0xb8])memory.put(address+offset,0);
  memory.put(address+0x54,1);memory.put(address+0x48,1);
  nativeRegisterTaskMemory(memory,address,1,0,host);return address;
}
