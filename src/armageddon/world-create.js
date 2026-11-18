import {nativeCreateLandscapeAt} from './landscape-create.js';
import {nativeCreateTeamControllerAt} from './controller-create.js';
import {nativeCreateTaskMemory,nativeRegisterTaskMemory} from './task-memory.js';
import {nativeCreateEventGroup,nativeSetGroupSubscription} from './event-group.js';
//004EAAD0 orchestration. Uncomposed child/world constructors use their original
//addressed interfaces; scene state, creation order and inventory health run here.
export function nativeInitializeWorld(memory,address,scene,setup,host) {
  const call=(entry,args=[],at=address)=>host.call(entry,at,args);
  const put=(offset,value)=>memory.put(address+offset,value);
  nativeCreateTaskMemory(memory,address,0,host);put(0,0x527478);put(0x2c,2);put(0x38,scene);put(0,0x527458);put(0x2c,5);memory.put(scene+0x1b76c,1);
  for(const offset of [0x3c,0x40,0x74,0x78,0x7c,0x50,0x60,0x54,0x58,0x70,0x64,0x68,0x84,0x88,0x8c,0x90,0x94])put(offset,0);
  put(0x44,memory.get(scene+0x804)<<16);put(0x48,memory.get(scene+0x804)<<16);
  for(const offset of [0x4c,0x5c,0x6c])put(offset,-1);
  put(0x80,memory.byte(setup+0xde));
  for(let offset=0x1c188;offset<=0x1c198;offset+=4)memory.put(scene+offset,0);
  host.virtual(memory.get(scene+0x7d4),0x20,[0x3d70]);
  host.virtual(memory.get(scene+0x7d4),0x2c,[memory.get(scene+0x804)]);
  memory.put(scene+0x1b8d8,(memory.get(scene+0x804)+160)<<16);
  if(((memory.get(scene+0x1b8d8)-memory.get(scene+0x1b8d4))&0xffff0000)<0x3000000)
    memory.put(scene+0x1b8d8,memory.get(scene+0x1b8d4)+0x3000000);
  const landscape=host.allocate(0x175c);
  if(landscape)(host.constructLandscape??((at,parent)=>nativeCreateLandscapeAt(memory,at,parent,host)))(landscape,address);
  const group=(type,events)=>{
    const storage=host.allocate(0xa0),task=storage?nativeCreateEventGroup(memory,storage,address,type,0,host):0;
    for(const event of events)nativeSetGroupSubscription(memory,task,event,true);
  };
  //004EB970 original global event group.
  group(25,[0x433,0x404,0x3e9,0x3ea,0x3eb,0x3ed,0x414,0x415,0x416,0x3ec,0x3f6,0x3fd,0x3ff]);
  call(0x4eba80,[setup]);
  for(let team=1;team<=memory.byte(setup+0xde);team++) {
    const storage=host.allocate(0x120);
    if(storage)nativeCreateTeamControllerAt(memory,storage,address,team,setup+0xe0+(team-1)*3000,host);
  }
  group(24,[0x3e9,0x3ea,0x3eb,0x3ed]);
  group(23,[0x404,0x3e9,0x3ea,0x3eb,0x3ed,0x3fd,0x400]);
  call(0x4ebe10,[setup]);call(0x4eaf40);
  for(let team=1;team<=(memory.get(address+0x80)|0);team++) {
    const inventory=scene+0x1b94,base=inventory+team*0x51c;
    let health=0;
    if(!memory.get(base-12))for(let worm=0;worm<(memory.get(base)|0);worm++)health=(health+memory.get(base-0x49c+worm*0x9c))|0;
    if((memory.get(scene+0x81c)|0)<health)memory.put(scene+0x81c,health);
  }
  nativeRegisterTaskMemory(memory,address,20,0,host);return address;
}
