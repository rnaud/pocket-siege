//004B1AE0 logical task construction. JS arrays own the two native child buffers;
// native allocation addresses/vtables are represented by objects, not fabricated.
export function nativeCreateTask({id,parent=null,memory=new Uint8Array(0x3c)}) {
  const task={id,parent,memory,ownsRegistry:parent===null,capacity:16,children:[],type:1,registryType:0,registryIndex:0,registry:parent?.registry??Array.from({length:256},()=>[])};
  if(parent) {
    if(parent.capacity<=parent.children.length)parent.capacity*=2;
    parent.children.push(task);
    if(parent.memory) {
      const view=new DataView(parent.memory.buffer,parent.memory.byteOffset,parent.memory.byteLength);
      view.setInt32(0xc,parent.capacity,true);view.setInt32(0x14,parent.children.length,true);
    }
  }
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  for(const [offset,value] of [[4,parent?.id??0],[0xc,16],[0x10,0],[0x14,0],[0x24,0],[0x28,0],[0x2c,1],[0x34,+task.ownsRegistry]])view.setInt32(offset,value,true);
  return task;
}
//004B2670/004CCE30 prepend even when another task already has the same key.
export function nativeRegisterTask(task,type,index) {
  task.registryType=type;task.registryIndex=index;
  const view=new DataView(task.memory.buffer,task.memory.byteOffset,task.memory.byteLength);
  view.setInt32(0x28,type,true);view.setInt32(0x24,index,true);
  const bucket=((Math.imul(index,17)+type)|0)%256;
  (task.registry[bucket]??=[]).unshift({type,index,task});return 1;
}
