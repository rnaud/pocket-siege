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

import { nativeRestorePhysicsMembership } from './replay-physics.js';
// Full004F42D0, composed with the base reconstruction above. Contact storage
// allocation is a host interface; the saved data still uses native byte layout.
export function nativeReadPhysicsTask(stream, options) {
  const task = nativeReadTaskBase(stream, options);
  const memory = options.memory ?? new Uint8Array(0xfc);
  const view = new DataView(memory.buffer, memory.byteOffset, memory.byteLength);
  for (const [offset, value] of [[0x24, task.registryIndex], [0x28, task.registryType],
    [0x2c, task.type], [0x34, +task.ownsRegistry], [0x38, options.context]])
    view.setInt32(offset, value, true);
  stream.readByte(); // Derived task marker2 (004ED9A0).
  stream.readByte(); // Physics marker3.
  memory.set(stream.readBlock(0xb0), 0x3c);
  for (const offset of [0xec, 0xf0, 0xf4, 0xf8]) view.setInt32(offset, 0, true);
  const environment = options.environment, category = view.getInt32(0x3c, true);
  const restored = nativeRestorePhysicsMembership({ id: task.id,
    all: environment.all, category: environment.categories[category],
    allIndex: view.getInt32(0xe8, true), categoryIndex: view.getInt32(0xe4, true),
    links: environment.links, linkIndex: view.getInt32(0x44, true) });
  environment.all = restored.all;
  environment.categories[category] = restored.category;
  environment.dirty = restored.dirty;
  view.setUint32(0xf0, restored.link, true);
  task.physicsPoints = new Uint8Array(0);
  if (view.getInt32(0xc8, true)) {
    const storage = options.allocateContacts(0x200);
    view.setUint32(0xf8, storage.pointer, true);
    storage.bytes.set(stream.readBlock(view.getInt32(0xdc, true) << 3));
    task.physicsPoints = storage.bytes;
  }
  view.setInt32(0xe4, -1, true);
  view.setInt32(0xe8, -1, true);
  task.memory = memory;
  return task;
}
