import { nativeBodyStartSound } from './body-sound.js';
import { nativeInitializeReplayPresentation } from './replay-presentation-restore.js';
import { NativeReplayBuffer } from './replay-buffer.js';
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
// Full004C8E40, including its 32 calls to004C8D10. Heap storage remains
// a host interface; list membership uses stable IDs instead of raw pointers.
export function nativeReadPhysicsEnvironment(stream, { context, links, allocate = size => new Uint8Array(size) }) {
  const makeList = () => {
    allocate(0x400);
    allocate(0x400);
    return { capacity: 256, entries: [], cursor: 0 };
  };
  const all = makeList();
  const categories = Array.from({ length: 32 }, makeList);
  stream.readByte(); // Marker0x21 is consumed without validation.
  const state = stream.readBlock(12);
  return { all, categories, state, context, links, dirty: 0 };
}

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

// Full004D6240 with004FD330 animation reconstruction and004D64F0 setup.
// Rendering constructors and allocation are explicit host interfaces.
export function nativeReadWormTask(stream, options) {
  const memory = options.memory ?? new Uint8Array(0x390);
  const task = nativeReadPhysicsTask(stream, { ...options, memory });
  const view = new DataView(memory.buffer, memory.byteOffset, memory.byteLength);
  const put = (offset, value) => view.setInt32(offset, value, true);
  stream.readByte();
  memory.set(stream.readBlock(0x23c), 0xfc);
  const animationPointer = options.allocateResource(0x164);
  put(0x350, animationPointer);
  task.animation = new Uint8Array(0);
  task.animationRenderer = animationPointer ? options.renderer : null;
  if (animationPointer) {
    stream.readByte();
    task.animation = stream.readBlock(0x15c);
  }
  const team = view.getInt32(0x170, true);
  put(0x354, team ? options.context + 0x125bc + Math.imul(team, 0x208) : 0);
  for (let i = 0; i < 6; i++) {
    const pointer = options.allocateResource(0x138);
    put(0x338 + i * 4, pointer ? options.constructText(pointer, options.renderer, 15, i < 3 ? 256 : 48) : 0);
  }
  const panel = options.allocateResource(0x34);
  put(0x358, panel ? options.constructPanel(panel, 2, 2, 30, 30) : 0);
  for (const offset of [0x35c, 0x360, 0x364, 0x370, 0x374, 0x380, 0x384, 0x38c, 0x388]) put(offset, 0);
  put(0x36c, 65536);
  put(0x368, 65536);
  put(0x37c, options.matchState.presentationValue);
  if (view.getInt32(0x13c, true)) options.matchState.activeCount = (options.matchState.activeCount + 1) | 0;
  return task;
}

// Concrete readers differ from writers: several non-persistent task writers
// are no-ops, while their constructors still consume saved records.
const actorReadBlocks = new Map([
  [7, [0x3c, 0x64]], [8, [0xfc, 0x94]], [9, [0xfc, 0x60]],
  [10, [0x3c, 0x50]], [11, [0xfc, 0x2d0]], [13, [0x3c, 0xc04]], [15, [0xfc, 0x168]], [16, [0x3c, 0x24]],
  [17, [0x3c, 0x1d4]], [21, [0xfc, 0x20]], [22, [0x3c, 0x28]],
  [23, [0x3c, 0x24]], [24, [0x3c, 0x74]], [25, [0x3c, 0x34]],
  [26, [0x3c, 0x54]], [27, [0x3c, 0x1c]], [29, [0x3c, 0x28]],
  [28, [0xfc, 0x10]], [30, [0xfc, 0x14]], [31, [0xd4, 0x2ce8]],
]);

// Dispatch for all21 concrete child constructors in004B2230. The factory
// handles unknown stream tags before reaching this constructor dispatch.
export function nativeReadReplayActor(tag, stream, options) {
  if (tag === 18) return nativeReadWormTask(stream, options);
  const block = actorReadBlocks.get(tag);
  if (!block) throw new Error(`Unknown replay actor constructor ${tag}`);
  const schema = taskTypes.find(row => row.tag === tag);
  const memory = options.memory ?? new Uint8Array(schema.size);
  const task = schema.physics ? nativeReadPhysicsTask(stream, { ...options, memory }) : nativeReadTaskBase(stream, options);
  const view = new DataView(memory.buffer, memory.byteOffset, memory.byteLength);
  const get = offset => view.getInt32(offset, true);
  const put = (offset, value) => view.setInt32(offset, value, true);
  if (!schema.physics) {
    stream.readByte(); //004ED9A0
    for (const [offset, value] of [[0x24, task.registryIndex], [0x28, task.registryType],
      [0x2c, task.type], [0x34, +task.ownsRegistry], [0x38, options.context]]) put(offset, value);
  }
  if (tag === 31) {
    //004F0BE0 initializes terrain-task state before the saved terrain block.
    put(0x3c, 0x12345678);
    put(0x40, 0);
    put(0xc4, 0);
    put(0xd0, 65536);
  }
  const increment = offset => {
    options.contextState.counters[offset] = (options.contextState.counters[offset] + 1) | 0;
  };
  // These constructors update the scene before reading their derived block.
  const counter = { 16: 0x12424, 22: 0x12428, 27: 0x12420 }[tag];
  if (counter) increment(counter);
  stream.readByte();
  memory.set(stream.readBlock(block[1]), block[0]);
  const text = (offset, font, width) => {
    const pointer = options.allocateResource(0x138);
    put(offset, pointer ? options.constructText(pointer, options.renderer, font, width) : 0);
  };
  if (tag === 8) {
    options.contextState.teamSlots[get(0x100)] = task.id;
    text(0x190, 15, 16);
  } else if (tag === 10) {
    const portrait = options.allocateResource(0x170);
    put(0x110, portrait ? options.constructPortrait(portrait, options.context, get(0x3c)) : 0);
    put(0x118, 0);
    const frame = options.allocateResource(0x3c);
    put(0x114, frame ? options.constructFrame(frame, options.context + 0x2b0, 8, 2, 2, 30, 30, options.palette[7], options.palette[8]) : 0);
    text(0x11c, 23, 480);
    for (const offset of [0xcc, 0xd0, 0xac, 0xbc, 0xb0, 0xb4, 0xb8, 0xe0, 0xf8, 0x104, 0xe4, 0xd4, 0xd8, 0xc8]) put(offset, 0);
    for (const offset of [0xe8, 0xec, 0xf0, 0xf4]) put(offset, -1);
    put(0xdc, 1);
  } else if (tag === 11) {
    text(0x3d0, 15, 48);
    text(0x3cc, 15, 16);
    put(0x3d8, 0);
    put(0x3d4, 0);
    if (get(0x31c)) {
      const sound = nativeBodyStartSound(options.audio.suppressed,
        options.audio.play ? { start: (...request) => options.audio.play(...request) } : null,
        [get(0x31c), 4, 65536, 65536, 0]);
      put(0x3d8, sound);
    }
    const sum = (get(0x138) + get(0x13c)) | 0;
    put(0x3dc, (get(0x140) + Math.trunc(sum / 25) + get(0x144)) & 65535);
  } else if (tag === 15) {
    put(0x264, 0);
    text(0x268, 15, 256);
    text(0x26c, 15, 48);
    text(0x270, 15, 48);
    if (get(0x260)) increment(get(0x124) === 3 ? 0x1b8f4 : 0x1b8f0);
    increment(0x1242c);
  } else if (tag === 24) {
    options.contextState.effectSlots[get(0x80)] = task.id;
    put(0xb0, options.contextState.counters[0x12430] & 255);
    increment(0x12430);
    put(0xb4, 0);
  } else if (tag === 28) nativeInitializeReplayPresentation(memory, options.presentation);
  else if (tag === 29) text(0x64, 23, 48);
  else if (tag === 31) {
    put(0x2dc8, 0);
    const queue = options.allocateResource(8);
    put(0x2dc4, queue);
    task.terrainQueue = null;
    if (queue) {
      const pointer = options.allocateResource(32);
      task.terrainQueue = { pointer: queue, ring: pointer ? {
        pointer, dataPointer: options.allocateResource(256), buffer: new NativeReplayBuffer(256),
      } : null };
    }
    const table = options.allocateResource(16);
    put(0x2dcc, table);
    task.terrainTable = table ? { pointer: table, capacity: 71,
      dataPointer: options.allocateResource(568), count: 0, bytes: new Uint8Array(568) } : null;
    put(0x2dd0, 0);
  }
  task.memory = memory;
  return task;
}

// Full004B2D40/004EADB0 and their setup helpers. Resource constructors are
// host interfaces; generated tasks, registry links and scene pools are native.
export function nativeReadReplayRoot(stream, options) {
  const task = nativeReadTaskBase(stream, { ...options, parent: null });
  const memory = options.memory ?? new Uint8Array(0x28c);
  const view = new DataView(memory.buffer, memory.byteOffset, memory.byteLength);
  const put = (offset, value) => view.setInt32(offset, value, true);
  for (const [offset, value] of [[0x24, task.registryIndex], [0x28, task.registryType],
    [0x2c, task.type], [0x34, 1], [0x38, options.context]]) put(offset, value);
  stream.readByte(); //004ED9A0 marker2
  stream.readByte(); //004EADB0 marker5
  memory.set(stream.readBlock(0x5c), 0x3c);
  for (const [size, type, registryType] of [[0xc40, 13, 26], [0x640, 14, 19]]) {
    const id = options.allocateResource(size);
    if (!id) continue;
    const child = { id, parent: task, ownsRegistry: false, capacity: 16, children: [],
      type, registryType, registryIndex: 0, registry: task.registry, memory: new Uint8Array(size) };
    const childView = new DataView(child.memory.buffer);
    for (const [offset, value] of [[4, task.id], [0x28, registryType], [0x2c, type], [0x38, options.context]]) childView.setInt32(offset, value, true);
    if (task.capacity <= task.children.length) task.capacity *= 2;
    task.children.push(child);
    task.registry[registryType].unshift({ type: registryType, index: 0, task: child });
  }
  const text = (offset, font, width) => {
    const pointer = options.allocateResource(0x138);
    put(offset, pointer ? options.constructText(pointer, options.renderer, font, width) : 0);
  };
  const scene = new DataView(options.sceneMemory.buffer, options.sceneMemory.byteOffset, options.sceneMemory.byteLength);
  //Pop a signed16 free ID, then insert it into the priority-ordered live list.
  const claim = (base, priority) => {
    const count = scene.getInt16(base + 0x20, true);
    if (!count) return -1;
    scene.setInt16(base + 0x20, count - 1, true);
    const index = scene.getInt16(base + 0x20, true);
    const value = scene.getInt16(base + index * 2, true);
    const length = scene.getInt16(base + 0x62, true);
    let slot = 0;
    while (slot < length && scene.getInt16(base + 0x22 + slot * 2, true) >= priority + 1) slot++;
    for (let i = length; i > slot; i--) {
      scene.setInt16(base + 0x22 + i * 2, scene.getInt16(base + 0x22 + (i - 1) * 2, true), true);
      scene.setInt16(base + 0x42 + i * 2, scene.getInt16(base + 0x42 + (i - 1) * 2, true), true);
    }
    scene.setInt16(base + 0x22 + slot * 2, priority, true);
    scene.setInt16(base + 0x42 + slot * 2, value, true);
    scene.setInt16(base + 0x62, length + 1, true);
    return value;
  };
  text(0xd0, 23, scene.getInt32(0x1b8dc, true));
  text(0xd4, 28, 128);
  for (let offset = 0x98; offset <= 0xc8; offset += 4) put(offset, 0);
  put(0xcc, claim(0x1b778, 0));
  stream.readByte(); //004B2D40 marker6
  memory.set(stream.readBlock(0x138), 0xd8);
  const surface = options.allocateResource(0x2c);
  if (surface) options.constructSurface(surface, 56, 42, 8);
  put(0x21c, surface);
  text(0x210, 25, 64);
  text(0x214, 15, 64);
  text(0x218, 15, 80);
  put(0x284, claim(0x1b848, 1));
  put(0x288, 0);
  task.memory = memory;
  return task;
}

// Compose the native recursive factory with concrete readers and the root.
// allocateTask supplies stable task IDs and optional zeroed backing memory.
export function nativeReadReplayTree(stream, options) {
  const readChildren = (parent, reader) => nativeReadTaskChildren(reader, parent,
    size => options.allocateTask(size),
    (schema, storage, parent, reader) => nativeReadReplayActor(schema.tag, reader, {
      ...options, id: storage.id, memory: storage.memory ?? new Uint8Array(schema.size),
      parent, readChildren,
    }));
  return nativeReadReplayRoot(stream, { ...options, readChildren });
}

// Full004A1D20. Cleanup and allocation remain host interfaces; stream order,
// copied context range, environment/tree reconstruction and phase are native.
export function nativeRestoreReplaySnapshot(stream, manager, options) {
  options.flushTask(manager.root);
  if (manager.root !== null) options.destroyTask(manager.root, 1);
  options.flushEnvironment(manager.environment);
  if (manager.environment !== null) options.destroyEnvironment(manager.environment, 1);
  stream.seek(0);
  options.sceneMemory.set(stream.readBlock(0x3fbc), 0x7ec);
  const scene = new DataView(options.sceneMemory.buffer, options.sceneMemory.byteOffset, options.sceneMemory.byteLength);
  const environmentStorage = options.allocateObject(0x3c4);
  manager.environment = environmentStorage === null ? null : {
    ...nativeReadPhysicsEnvironment(stream, { context: options.context, links: options.links, allocate: options.allocateEnvironmentBuffer }),
    id: environmentStorage.id,
  };
  scene.setUint32(0x7d4, manager.environment?.id ?? 0, true);
  stream.readByte(); // Outer concrete root tag, consumed even if allocation fails.
  const rootStorage = options.allocateObject(0x28c);
  manager.root = rootStorage === null ? null : nativeReadReplayTree(stream, {
    ...options, id: rootStorage.id, memory: rootStorage.memory ?? new Uint8Array(0x28c),
    environment: manager.environment,
  });
  scene.setInt32(0x12414, 14, true);
  return manager;
}
