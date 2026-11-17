// 004B1F50. Children precede the parent's derived records. Null child
// slots are skipped; a child returning zero ends traversal without a terminator.
export function nativeWriteTaskHeader(stream, task, writeChild) {
  for (const value of [task.type, 1, task.type, task.registryType, task.registryIndex])
    stream.writeByte(value);
  for (const child of task.children) {
    if (child === null) continue;
    if (!writeChild(child, stream)) return 1;
  }
  stream.writeByte(0);
  return 1;
}

// Full004B2D80 through004EADF0 and004ED9D0, including all base records.
export function nativeWriteMatchController(stream, task, writeChild) {
  nativeWriteTaskHeader(stream, task, writeChild);
  stream.writeByte(2);
  stream.writeByte(5);
  stream.writeBlock(task.presentation);
  stream.writeByte(6);
  stream.writeBlock(task.controller);
  return 1;
}

// Full004C8EE0: environment3B4..3BF, restored by004C8E40.
export function nativeWritePhysicsEnvironment(stream, bytes) {
  stream.writeByte(0x21);
  stream.writeBlock(bytes);
  return 1;
}

import taskTypes from './replay-task-types.json' with { type: 'json' };
export const nativeReplayTaskTypes = taskTypes;

// All21 concrete child serializers reachable from004B2230. memory contains
// the native task record; object references use stable IDs in environment lists.
export function nativeWriteReplayTask(stream, task, environment) {
  //00502A50: fresh type14 created by root setup has no saved record.
  if (task.type === 14) return 1;
  const schema = taskTypes.find(row => row.tag === task.type);
  if (!schema) throw new RangeError(`Unknown native replay task ${task.type}`);
  if (!schema.block) return 1; // Original no-op serializers emit no header.
  const view = new DataView(task.memory.buffer, task.memory.byteOffset, task.memory.byteLength);
  nativeWriteTaskHeader(stream, {
    type: view.getInt32(0x2c, true), registryType: view.getInt32(0x28, true),
    registryIndex: view.getInt32(0x24, true), children: task.children,
  }, child => nativeWriteReplayTask(stream, child, environment));
  stream.writeByte(2);
  if (schema.physics) {
    stream.writeByte(3);
    const category = view.getInt32(0x3c, true);
    // Original004C9300 preserves holes and returns the first matching index.
    view.setInt32(0xe8, environment.all.indexOf(task.id), true);
    view.setInt32(0xe4, (environment.categories[category] ?? []).indexOf(task.id), true);
    stream.writeBlock(task.memory.slice(0x3c, 0xec));
    if (view.getInt32(0xc8, true))
      stream.writeBlock(task.physicsPoints.slice(0, view.getInt32(0xdc, true) * 8));
    view.setInt32(0xe4, -1, true);
    view.setInt32(0xe8, -1, true);
  }
  stream.writeByte(task.type);
  const [offset, size] = schema.block;
  stream.writeBlock(task.memory.slice(offset, offset + size));
  if (schema.nestedAnimation) {
    stream.writeByte(0x20);
    stream.writeBlock(task.animation);
  }
  return 1;
}
