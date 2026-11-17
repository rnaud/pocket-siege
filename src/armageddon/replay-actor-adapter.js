import { NativeAnimationPlayer } from './animation.js';

const views = { Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
  Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array, DataView };

// Browser actor graph, separate from native task records. Resource identities
// are supplied by the host, which owns meshes, DOM and audio lifetimes.
export function captureReplayActors(actors, { resourceKey = () => undefined } = {}) {
  const nodes = [], seen = new Map();
  const encode = value => {
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'function' || typeof value === 'symbol') throw new TypeError('Unmapped replay actor resource');
      return { value };
    }
    if (seen.has(value)) return { ref: seen.get(value) };
    const index = nodes.length;
    seen.set(value, index); nodes.push(null);
    const key = resourceKey(value);
    let node;
    if (key !== undefined) {
      if (typeof key !== 'string') throw new TypeError('Replay resource keys must be strings');
      node = { kind: 'resource', key };
    } else if (value instanceof NativeAnimationPlayer) node = { kind: 'animation', bytes: value.replayState() };
    else if (value instanceof ArrayBuffer) node = { kind: 'buffer', bytes: new Uint8Array(value).slice() };
    else if (ArrayBuffer.isView(value)) {
      const type = value.constructor.name;
      if (!Object.hasOwn(views, type)) throw new TypeError(`Unsupported replay view: ${type}`);
      node = { kind: 'view', type, buffer: encode(value.buffer), offset: value.byteOffset,
        length: value instanceof DataView ? value.byteLength : value.length };
    } else if (value instanceof Map) node = { kind: 'map', entries: [...value].map(([k,v]) => [encode(k),encode(v)]) };
    else if (value instanceof Set) node = { kind: 'set', entries: [...value].map(encode) };
    else {
      const prototype = Object.getPrototypeOf(value);
      if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null)
        throw new TypeError(`Unmapped replay actor resource: ${value.constructor?.name ?? 'object'}`);
      node = { kind: Array.isArray(value) ? 'array' : 'object', nullPrototype: prototype === null,
        length: Array.isArray(value) ? value.length : undefined,
        entries: Object.keys(value).map(key => [key, encode(value[key])]) };
    }
    nodes[index] = node;
    return { ref: index };
  };
  const ids = new Set();
  const roots = actors.map(({ id, actor }) => {
    if (typeof id !== 'string' || ids.has(id)) throw new TypeError('Replay actors need unique string IDs');
    ids.add(id);
    return { id, state: encode(actor) };
  });
  return { roots, nodes };
}

// Build a detached graph first. The host installs actors and rebuilds its
// collision/render registries after this succeeds; live actors are not mutated.
export function restoreReplayActors(snapshot, { resolveResource = () => undefined } = {}) {
  const objects = new Array(snapshot.nodes.length);
  const decode = entry => Object.hasOwn(entry, 'ref') ? materialize(entry.ref) : entry.value;
  function materialize(index) {
    if (Object.hasOwn(objects, index)) return objects[index];
    const node = snapshot.nodes[index];
    if (!node) throw new RangeError('Invalid replay actor reference');
    let value;
    switch (node.kind) {
      case 'resource':
        value = resolveResource(node.key);
        if (value === undefined) throw new Error(`Missing replay resource: ${node.key}`);
        break;
      case 'animation': value = new NativeAnimationPlayer().restoreReplayState(node.bytes); break;
      case 'buffer': value = node.bytes.slice().buffer; break;
      case 'view': {
        if (!Object.hasOwn(views, node.type)) throw new TypeError('Unsupported replay view');
        value = new views[node.type](decode(node.buffer), node.offset, node.length); break;
      }
      case 'map': value = new Map(); break;
      case 'set': value = new Set(); break;
      case 'array': value = new Array(node.length); break;
      case 'object': value = Object.create(node.nullPrototype ? null : Object.prototype); break;
      default: throw new TypeError('Unsupported replay actor node');
    }
    objects[index] = value;
    if (node.kind === 'map') for (const [k,v] of node.entries) value.set(decode(k),decode(v));
    else if (node.kind === 'set') for (const entry of node.entries) value.add(decode(entry));
    else if (node.kind === 'object' || node.kind === 'array') for (const [key,entry] of node.entries)
      Object.defineProperty(value, key, { value: decode(entry), writable: true, enumerable: true, configurable: true });
    return value;
  }
  return new Map(snapshot.roots.map(({ id, state }) => [id, decode(state)]));
}
