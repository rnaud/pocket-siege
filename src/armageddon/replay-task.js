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
