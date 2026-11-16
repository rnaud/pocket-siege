import { nativeCollisionOverlap } from "./collision-mask.js";

// 004C97A0 / 004C98E0 / 004C9970. The registry is an array of 32 sparse
// body lists, ordered by native type. Bodies use signed 16.16 positions.
// Overlap markers belong to the registered bodies, not to each query actor.
export class NativeCollisionRegistry {
  constructor(registry, overlap = nativeCollisionOverlap) {
    this.registry = registry;
    this.overlap = overlap;
    this.cache = null;
  }

  *candidates(flags) {
    for (let type = 0; type < 32; type++) {
      if (!(flags & (1 << type))) continue;
      for (const body of this.registry[type] ?? []) if (body) yield body;
    }
  }

  intersects(mask, x, y, other) {
    return this.overlap(
      mask,
      x >> 16,
      y >> 16,
      other.mask,
      other.x >> 16,
      other.y >> 16,
    );
  }

  prime(actor) {
    const c = this.cache;
    if (
      c &&
      c.actor === actor &&
      c.x === actor.x &&
      c.y === actor.y &&
      c.shape === actor.shape &&
      c.flags === actor.flags
    )
      return;
    // Use the actor's own flags here, independently of the query's flags.
    // Unselected types retain their previous markers, as in 004C9970.
    for (const other of this.candidates(actor.flags)) {
      other.overlap = 0;
      if (
        other !== actor &&
        other.enabled &&
        this.intersects(actor.mask, actor.x, actor.y, other)
      )
        other.overlap = 1;
    }
    this.cache = {
      actor,
      x: actor.x,
      y: actor.y,
      shape: actor.shape,
      flags: actor.flags,
    };
  }

  query(actor, x, y, mask, flags) {
    if (!flags) return null;
    this.prime(actor);
    for (const other of this.candidates(flags)) {
      if (
        other !== actor &&
        other.enabled &&
        !other.overlap &&
        this.intersects(mask, x, y, other)
      )
        return other;
    }
    return null;
  }
}
