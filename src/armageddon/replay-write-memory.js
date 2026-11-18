import taskTypes from './replay-task-types.json' with {type:'json'};

//004B1F50 rereads the child count and backing array after each virtual writer.
//A child returning zero stops traversal without writing a terminator.
export function nativeWriteTaskHeaderMemory(memory,address,stream,writeChild=child=>nativeWriteActorMemory(memory,child,stream)) {
  for(const value of [memory.get(address+0x2c),1,memory.get(address+0x2c),memory.get(address+0x28),memory.get(address+0x24)])stream.writeByte(value);
  let index=0;
  while(index<(memory.get(address+0x14)|0)) {
    const child=memory.get(memory.get(address+0x18)+index++*4);
    if(child&&!writeChild(child,stream))return 1;
  }
  stream.writeByte(0);return 1;
}
export function nativeWriteMatchMemory(memory,address,stream,writeChild) {
  nativeWriteTaskHeaderMemory(memory,address,stream,writeChild);
  stream.writeByte(2);stream.writeByte(5);stream.writeBlock(memory.range(address+0x3c,0x5c));
  stream.writeByte(6);stream.writeBlock(memory.range(address+0xd8,0x138));return 1;
}
export function nativeWriteEnvironmentMemory(memory,address,stream) {
  stream.writeByte(33);stream.writeBlock(memory.range(address+0x3b4,12));return 1;
}

//Concrete virtual serializers, including no-op transient tasks. Dispatch uses
//the concrete vtable; the saved header still uses the task's own identity bytes.
export function nativeWriteActorMemory(memory,address,stream,writeChild) {
  const vtable=memory.get(address);
  if(vtable===0x526720)return nativeWriteMatchMemory(memory,address,stream,writeChild);
  if(vtable===0x5277e0)return 1;
  const schema=taskTypes.find(row=>Number(row.vtable)===vtable);
  if(!schema)throw new RangeError(`Unknown replay writer vtable ${vtable.toString(16)}`);
  if(!schema.block)return 1;
  nativeWriteTaskHeaderMemory(memory,address,stream,writeChild);stream.writeByte(2);
  if(schema.physics) {
    stream.writeByte(3);
    const environment=memory.get(memory.get(address+0x38)+0x7d4);
    const find=list=>{for(let i=0;i<(memory.get(list+12)|0);i++)if(memory.get(memory.get(list+16)+i*4)===address)return i;return -1;};
    memory.put(address+0xe8,find(environment+0x18));
    memory.put(address+0xe4,find(environment+0x34+memory.get(address+0x3c)*0x1c));
    stream.writeBlock(memory.range(address+0x3c,0xb0));
    if(memory.get(address+0xc8))stream.writeBlock(memory.range(memory.get(address+0xf8),memory.get(address+0xdc)<<3));
    memory.put(address+0xe4,-1);memory.put(address+0xe8,-1);
  }
  stream.writeByte(schema.tag);const [offset,size]=schema.block;
  stream.writeBlock(memory.range(address+offset,size));
  if(schema.nestedAnimation){stream.writeByte(32);stream.writeBlock(memory.range(memory.get(address+0x350)+8,0x15c));}
  return 1;
}
