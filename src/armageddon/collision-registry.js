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

  //004C9650: standalone shape probe. Unlike movement queries this has no
  // query actor, self exclusion, cached overlaps or overlap-marker writes.
  probe(mask, x, y, flags) {
    for(const body of this.candidates(flags))
      if(body.enabled && this.intersects(mask,x,y,body))return body;
    return null;
  }
}

// Full004C9500, manager virtual+30. Raster operations remain explicit mask
// interfaces. Native calls bounds even though its four outputs are unused.
export function nativeDrawCollisionRegistry(registry,surface,dx,dy,excluded,flags,mode,host) {
  for(let type=0;type<32;type++) {
    if(!(flags&(1<<type)))continue;
    const row=registry[type] ?? [];
    for(let i=0;i<row.length;i++) {
      const body=row[i];
      if(!body || !body.enabled || body===excluded)continue;
      const mask=body.mask;
      host.bounds(mask);
      host.draw(mask,surface,((body.x>>16)+(dx>>16))|0,((body.y>>16)+(dy>>16))|0,mode);
    }
  }
}
