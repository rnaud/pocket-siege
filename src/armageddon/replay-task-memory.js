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
