import {nativeCreateMineAt} from './mine-memory.js';
import {nativeCreateBarrelAt} from './barrel-memory.js';
import {nativeSelectSpawnAt,nativeSelectSideSpawnAt,nativeReserveSpawnAt,nativeSpawnRandom} from './spawn-pool.js';
import {nativeLookupTaskMemory} from './task-memory.js';

//004EBA80. Reserve before invoking constructors so their RNG/pool changes are
//observed by the next iteration. Native mine/barrel factories are the defaults.
export function nativePopulateMapObjectsAt(memory,address,setup,host) {
  const scene=memory.get(address+0x38),pool=memory.get(scene+0x44c);
  const parent=nativeLookupTaskMemory(memory,memory.get(address+0x30),25,0);
  let reserve=0,ordinal=0;
  for(let i=0;i<memory.byte(scene+0x4886);i++)reserve+=memory.byte(scene+0x543c+i*3000);
  const random=()=>nativeSpawnRandom(memory.range(scene,0x20000));
  const choose=mode=>{
    const output={};
    const found=mode===2?nativeSelectSpawnAt(memory,pool,random()>>>8,output):nativeSelectSideSpawnAt(memory,pool,mode===0,output);
    if(!found)return null;
    nativeReserveSpawnAt(memory,pool,output.value);return output.value;
  };
  while(ordinal<memory.byte(setup+0xd5a7)) {
    if((memory.get(pool+4)|0)<=reserve)break;
    const position=choose(memory.byte(scene+0x11d51)?ordinal%3:2);if(position===null)break;
    const fuseByte=(memory.byte(setup+0xd5a6)<<24)>>24;
    const fuse=fuseByte<0?random()%3000:fuseByte*1000;
    const x=position&0xffff0000,y=position<<16,kind=memory.byte(scene+0x11d50);
    if(kind===0||(kind!==1&&(ordinal&1))) {
      const storage=host.allocate(0x194);
      if(storage)(host.constructNaturalMine??((...args)=>nativeCreateMineAt(memory,...args,host)))(storage,parent,[48,0,60,fuse,0,100,50,0],[0,0,x,y,0,0,0,0,0,0,0],1,0);
    } else {
      const storage=host.allocate(0x110);
      if(storage)(host.constructNaturalBarrel??((...args)=>nativeCreateBarrelAt(memory,...args,host)))(storage,parent,x,y,1);
    }
    ordinal++;
  }
  while(reserve<(memory.get(pool+4)|0)) {
    if(choose(ordinal%5<2?ordinal%5:2)===null)return;
    ordinal++;
  }
}
