import {nativeCreatePhysicsAt} from './physics-memory.js';
import {nativeQueryCollisionMemory} from './collision-registry.js';

//004D0D30: native physical ownership, shared presentation slot and placement.
export function nativeCreateBarrelAt(memory,address,parent,x,y,settle,host) {
  nativeCreatePhysicsAt(memory,address,parent,17,9,host);
  memory.put(address,0x526988);memory.put(address+0x2c,30);
  for(const offset of [0xfc,0x104,0x10c])memory.put(address+offset,0);
  memory.put(address+0x108,50);
  const scene=memory.get(address+0x38),environment=memory.get(scene+0x7d4);
  let slot=-1;
  if(memory.get(scene+0xc28)) {
    memory.put(scene+0xc28,memory.get(scene+0xc28)-1);slot=memory.get(scene+0x828+memory.get(scene+0xc28)*4)|0;
    const count=memory.get(scene+0x102c);memory.put(scene+0x1030+slot*4,count);memory.put(scene+0xc2c+count*4,slot);memory.put(scene+0x102c,count+1);
  }
  memory.put(address+0x100,slot);
  const rank=memory.get(scene+0x1030+slot*4)|0;
  if(rank) {
    for(let i=0;i<(memory.get(scene+0x102c)|0);i++) {
      const at=scene+0x1030+memory.get(scene+0xc2c+i*4)*4;
      if((memory.get(at)|0)<rank)memory.put(at,memory.get(at)+1);
    }
    memory.put(scene+0x1030+slot*4,0);
  }
  const place=()=>{
    if(nativeQueryCollisionMemory(memory,environment,address,x,y,memory.get(address+0xf0),memory.get(address+0x40),host.collisionOverlap))return true;
    memory.put(address+0x90,x);memory.put(address+0x94,y);memory.put(address+0xb8,0);return false;
  };
  memory.put(address+0x40,2);place();
  for(const [offset,value] of [[0x40,0x40180e],[0x78,0],[0x68,0],[0x7c,0x8000],[0x58,65536],[0x48,1]])memory.put(address+offset,value);
  if(settle)while((y>>16)<(memory.get(scene+0x804)|0)){if(place())break;y=(y+65536)|0;}
  return address;
}
