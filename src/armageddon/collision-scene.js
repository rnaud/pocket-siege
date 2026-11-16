import { nativeWormState, nativeWormCollisionType } from "./worm-collision-type.js";
import shapes from "./collision-shapes.json" with { type: "json" };
import { nativeCollisionOverlap } from "./collision-mask.js";
import { NativeCollisionRegistry } from "./collision-registry.js";

const fixed = (value) => Math.round(value * 65536) | 0;
const scenes = new WeakMap();

// Bridge the host terrain/worm list to the original type-ordered registry.
// Other native body categories and their lifetime rules remain to be ported.
export class NativeCollisionScene {
  constructor(terrain, height) {
    this.height = height;
    this.terrain = terrain;
    this.actors = new WeakMap();
    this.worms = [];
    this.wormBodies = [];
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

  query(identity, body, x, y) {
    const wormIndex = this.worms.indexOf(identity);
    let actor =
      wormIndex >= 0 ? this.wormBodies[wormIndex] : this.actors.get(identity);
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
) {
  let scene = scenes.get(terrain);
  if (!scene || scene.height !== height) {
    scene = new NativeCollisionScene(terrain, height);
    scenes.set(terrain, scene);
  }
  scene.syncWorms(worms);
  return scene.query(identity, body, x, y);
}
