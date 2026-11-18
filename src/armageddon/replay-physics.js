// Full004C8F80. Restore a body's saved list positions without compacting holes
// or replacing occupied slots. Negative indices use the normal append path.
export function nativeRestorePhysicsMembership(input) {
  const insert = (list, index) => {
    const result = { ...list, entries: [...list.entries] };
    const append = value => {
      if (result.capacity <= result.entries.length) result.capacity *= 2;
      result.entries.push(value);
    };
    if (index < 0) append(input.id);
    else {
      while (result.entries.length <= index) append(null);
      if (result.entries[index] === null) result.entries[index] = input.id;
    }
    return result;
  };
  return {
    all: insert(input.all, input.allIndex),
    category: insert(input.category, input.categoryIndex),
    dirty: 0,
    link: input.links[input.linkIndex],
  };
}

// Shared004C8F80 adapter for fresh construction and replay restoration.
export function nativeRegisterPhysicsTask(task,environment) {
  const view=new DataView(task.memory.buffer,task.memory.byteOffset,task.memory.byteLength),category=view.getInt32(0x3c,true);
  const restored=nativeRestorePhysicsMembership({id:task.id,all:environment.all,category:environment.categories[category],allIndex:view.getInt32(0xe8,true),categoryIndex:view.getInt32(0xe4,true),links:environment.links,linkIndex:view.getInt32(0x44,true)});
  environment.all=restored.all;environment.categories[category]=restored.category;environment.dirty=restored.dirty;
  view.setUint32(0xf0,restored.link,true);
}
