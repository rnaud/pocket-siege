// Full004B1DE0's base task reconstruction. The outer factory has already
// consumed the concrete type tag. Derived constructors read their own records.
export function nativeReadTaskBase(stream, { id, parent = null, readChildren }) {
  const task = {
    id, parent, ownsRegistry: parent === null,
    capacity: 16, children: [], type: 1, registryType: 0, registryIndex: 0,
    registry: parent?.registry ?? Array.from({ length: 256 }, () => []),
  };
  if (parent) {
    if (parent.capacity <= parent.children.length) parent.capacity *= 2;
    parent.children.push(task);
  }
  stream.readByte(); // Base-class marker is consumed without validation.
  task.type = stream.readByte();
  const registryType = stream.readByte(), registryIndex = stream.readByte();
  if (registryType) {
    task.registryType = registryType;
    task.registryIndex = registryIndex;
    const bucket = (registryIndex * 17 + registryType) & 255;
    // 004CCE30 prepends even when an existing key has the same type/index.
    task.registry[bucket].unshift({ type: registryType, index: registryIndex, task });
  }
  readChildren(task, stream); // Native base ignores the factory's return value.
  return task;
}

import taskTypes from './replay-task-types.json' with { type: 'json' };
// Full004B2230. Allocation and concrete constructors are supplied by the
// host. Failed allocations continue reading; unknown tags terminate with zero.
export function nativeReadTaskChildren(stream, parent, allocate, construct) {
  for (;;) {
    const tag = stream.readByte();
    if (tag === 0) return 1;
    const schema = taskTypes.find(row => row.tag === tag);
    if (!schema) return 0;
    const handle = allocate(schema.size);
    if (handle !== null) construct(schema, handle, parent, stream);
  }
}
