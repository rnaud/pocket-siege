import { nativeCompactPhysicsEntries } from "./physics-compaction.js";

// The environment's physics list (scene+0x7D4, +0x24 count, +0x28 entries).
// 004C8F80 appends each new body, 004C9460 leaves a hole when one is removed,
// and the end-of-frame 004CA7E0 compacts the list, keeping its order.
// 004CA750 advances the bodies in list order and passes each one's
// one-based slot to 004CA320, whose (frame + slot) % 13 test schedules the
// sleeping recheck. The terrain body is created first and holds slot 1.
export class NativePhysicsList {
  constructor() {
    this.entries = [];
    this.slots = new Map();
    this.dirty = false;
  }

  // Bring membership up to date: bodies no longer live leave holes, new ones
  // are appended in the order given.
  sync(bodies) {
    const live = new Set(bodies);
    this.entries.forEach((body, index) => {
      if (body !== null && !live.has(body)) {
        this.entries[index] = null;
        this.slots.delete(body);
        this.dirty = true;
      }
    });
    for (const body of bodies) {
      if (body == null || this.slots.has(body)) continue;
      this.append(body);
    }
  }

  append(body) {
    this.entries.push(body);
    this.slots.set(body, this.entries.length);
    return this.entries.length;
  }

  // One-based slot as 004CA750 passes it, or 0 for a body not in the list.
  slot(body) {
    return this.slots.get(body) ?? 0;
  }

  // Bodies with their slots in 004CA750 order, skipping holes.
  ordered() {
    const result = [];
    this.entries.forEach((body, index) => { if (body !== null) result.push([body, index + 1]); });
    return result;
  }

  // 004CA7E0 at the end of the frame.
  finishFrame() {
    if (!this.dirty) return;
    const source = this.entries, target = [];
    target.length = nativeCompactPhysicsEntries(source.length, (index) => source[index],
      (index, body) => { target[index] = body; });
    this.entries = target;
    this.slots = new Map(target.map((body, index) => [body, index + 1]));
    this.dirty = false;
  }
}

// 004B26F0: forward an event to each child task in order, re-reading the
// list after each callback, so children appended meanwhile are reached in
// the same pass and removed ones are skipped. `members()` gives the live
// children; the same list keeps their creation order across frames.
export function nativeRunTaskGroup(list, members, step) {
  list.sync(members());
  for (let index = 0; index < list.entries.length; index++) {
    const task = list.entries[index];
    if (task !== null) step(task);
    list.sync(members());
  }
  list.finishFrame();
}
