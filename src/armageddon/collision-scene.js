import { nativeWormState, nativeWormCollisionType } from "./worm-collision-type.js";
import shapes from "./collision-shapes.json" with { type: "json" };
import { nativeCollisionOverlap } from "./collision-mask.js";
import { NativeCollisionRegistry } from "./collision-registry.js";

const fixed = (value) => Math.round(value * 65536) | 0;
const scenes = new WeakMap();

// Bridge live bodies to the original type-ordered registry.
// Negative IDs identify non-worm bodies; terrain/worm IDs retain their host mapping.
export class NativeCollisionScene {
  constructor(terrain, height) {
    this.height = height;
    this.terrain = terrain;
    this.actors = new WeakMap();
    this.worms = [];
    this.wormBodies = [];
    this.objects = new Map();
    this.nextObjectId = -1;
    this.rows = Array.from({ length: 32 }, () => []);
    const terrainMask = {};
    this.rows[1].push({
      id: 1,
      x: 0,
      y: 0,
      mask: terrainMask,
      enabled: 1,
      overlap: 0,
    });
    this.manager = new NativeCollisionRegistry(
      this.rows,
      (a, ax, ay, b, bx, by) => {
        if (b === terrainMask) {
          const left = ax - a.anchorX,
            top = ay - a.anchorY;
          return Number(
            a.planes[0].points.some(([x, y]) =>
              terrain.solid(left + x, height - 1 - top - y),
            ),
          );
        }
        return nativeCollisionOverlap(a, ax, ay, b, bx, by);
      },
    );
  }

  syncWorms(worms) {
    if (
      worms.length !== this.worms.length ||
      worms.some((w, i) => w !== this.worms[i])
    ) {
      this.worms = [...worms];
      for (let type = 2; type <= 6; type++) this.rows[type] = [];
      this.wormBodies = worms.map((w, i) => ({
        id: i + 2,
        type: -1,
        shape: 3,
        mask: shapes.shapes[3],
        overlap: 0,
      }));
      // Original add/remove004C8F80/004C9460 invalidate the current actor.
      this.manager.cache = null;
    }
    worms.forEach((w, i) => {
      const body = this.wormBodies[i];
      const type = nativeWormCollisionType(nativeWormState(w));
      if (body.type !== type) {
        if (body.type >= 0) {
          const row = this.rows[body.type];
          row[row.indexOf(body)] = null;
        }
        const row = this.rows[type], free = row.indexOf(null);
        if (free < 0) row.push(body); else row[free] = body;
        body.type = type;
        this.manager.cache = null;
      }
      Object.assign(body, {
        x: fixed(w.x), y: fixed(this.height - w.y), enabled: Number(w.hp > 0),
      });
    });
  }

  syncObjects(objects) {
    const live = new Set(objects);
    for (const [identity, actor] of this.objects) {
      if (live.has(identity) && identity.nativeBody) continue;
      const row = this.rows[actor.type];
      row[row.indexOf(actor)] = null;
      this.objects.delete(identity);
      this.manager.cache = null;
    }
    for (const identity of objects) {
      const body = identity.nativeBody;
      if (!body) continue;
      let actor = this.objects.get(identity);
      if (!actor) {
        actor = { id: this.nextObjectId--, type: -1, overlap: 0 };
        this.objects.set(identity, actor);
      }
      if (actor.type !== body.type) {
        if (actor.type >= 0) {
          const row = this.rows[actor.type];
          row[row.indexOf(actor)] = null;
        }
        const row = this.rows[body.type], free = row.indexOf(null);
        if (free < 0) row.push(actor); else row[free] = actor;
        this.manager.cache = null;
      }
      Object.assign(actor, { type: body.type, x: body.x, y: body.y,
        shape: body.shape, mask: shapes.shapes[body.shape], enabled: body.enabled });
    }
  }

  query(identity, body, x, y) {
    const wormIndex = this.worms.indexOf(identity);
    let actor =
      wormIndex >= 0 ? this.wormBodies[wormIndex] : this.objects.get(identity) ?? this.actors.get(identity);
    if (!actor) {
      actor = {};
      this.actors.set(identity, actor);
    }
    Object.assign(actor, {
      x: body.x,
      y: body.y,
      shape: body.shape,
      flags: body.flags,
      mask: shapes.shapes[body.shape],
    });
    return (
      this.manager.query(
        actor,
        fixed(x),
        fixed(this.height - y),
        actor.mask,
        actor.flags,
      )?.id ?? 0
    );
  }
}

export function nativeSceneCollision(
  identity,
  body,
  x,
  y,
  terrain,
  worms,
  height,
  objects = [],
) {
  let scene = scenes.get(terrain);
  if (!scene || scene.height !== height) {
    scene = new NativeCollisionScene(terrain, height);
    scenes.set(terrain, scene);
  }
  scene.syncWorms(worms);
  scene.syncObjects(objects);
  return scene.query(identity, body, x, y);
}

export function nativeSceneObject(terrain, id) {
  const scene = scenes.get(terrain);
  if (scene) for (const [identity, actor] of scene.objects)
    if (actor.id === id) return identity;
  return null;
}
