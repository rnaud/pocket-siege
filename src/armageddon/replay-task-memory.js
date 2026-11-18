import {nativeInitializeWormResourcesAt} from './worm-resources.js';
import {nativeRegisterPhysicsMemory} from './physics-memory.js';
import {nativeCreateTaskMemory,nativeRegisterTaskMemory} from './task-memory.js';
import {nativeReadTaskChildren} from './replay-restore.js';

//004B1DE0 uses the same owned arrays, parent attachment and registry creation
//as fresh004B1AE0, then restores byte-sized identities before child dispatch.
export function nativeReadTaskMemory(memory,address,parent,stream,host) {
  nativeCreateTaskMemory(memory,address,parent,host);
  stream.readByte();
  memory.put(address+0x2c,stream.readByte());
  const type=stream.readByte(),index=stream.readByte();
  if(type)nativeRegisterTaskMemory(memory,address,type,index,host);
  //The original base constructor ignores the recursive factory return value.
  nativeReadTaskChildren(stream,address,size=>host.allocate(size)||null,
    (schema,child,parent,reader)=>host.restoreChild(schema,child,parent,reader));
  return address;
}

//004ED9A0/004F42D0: restore body fields, rejoin sparse collision lists,
//then allocate saved contact storage before clearing membership indices.
export function nativeReadPhysicsMemory(memory,address,parent,context,stream,host) {
  nativeReadTaskMemory(memory,address,parent,stream,host);
  memory.put(address,0x527478);stream.readByte();memory.put(address+0x38,context);
  memory.put(address,0x527548);stream.readByte();
  memory.range(address+0x3c,0xb0).set(stream.readBlock(0xb0));
  for(const offset of [0xec,0xf4,0xf8,0xf0])memory.put(address+offset,0);
  nativeRegisterPhysicsMemory(memory,memory.get(context+0x7d4),address,host);
  if(memory.get(address+0xc8)) {
    const contacts=host.allocateArray(0x200,0x56f7b8);memory.put(address+0xf8,contacts);
    const size=memory.get(address+0xdc)<<3;memory.range(contacts,size).set(stream.readBlock(size));
  }
  memory.put(address+0xe4,-1);memory.put(address+0xe8,-1);
  return address;
}

//004D6240/004FD330: full saved worm and animation state, team inventory
//pointer and the same presentation resource ownership as fresh construction.
export function nativeReadWormMemory(memory,address,parent,context,stream,host) {
  nativeReadPhysicsMemory(memory,address,parent,context,stream,host);
  memory.put(address,0x526de0);stream.readByte();
  memory.range(address+0xfc,0x23c).set(stream.readBlock(0x23c));
  const animation=host.allocate(0x164);
  if(animation) {
    memory.put(animation,0x527670);stream.readByte();
    memory.range(animation+8,0x15c).set(stream.readBlock(0x15c));
    memory.put(animation+4,memory.get(context+8));
  }
  memory.put(address+0x350,animation);
  const team=memory.get(address+0x170);
  memory.put(address+0x354,team?context+0x125bc+Math.imul(team,0x208):0);
  nativeInitializeWormResourcesAt(memory,address,context,host);
  return address;
}
