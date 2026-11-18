import {nativeCompactPhysicsEntries} from './physics-compaction.js';
import {nativeRestorePhysicsMembership} from './replay-physics.js';
import { nativeWormState, nativeWormCollisionType } from "./worm-collision-type.js";
import shapes from "./collision-shapes.json" with { type: "json" };
import { nativeCollisionOverlap } from "./collision-mask.js";
import { NativeCollisionRegistry } from "./collision-registry.js";
import { nativeNearestBody } from "./nearest-body.js";

const fixed = (value) => Math.round(value * 65536) | 0;
const scenes = new WeakMap();
const placementMasks = new WeakMap();

function placementMask(mask) {
  let result = placementMasks.get(mask);
  if (!result) {
    const pixels = new Uint8Array(mask.width * mask.height);
    for (const [x, y] of mask.planes[0].points) pixels[y * mask.width + x] = 1;
    result = { width: mask.width, height: mask.height,
      anchorX: mask.anchorX, anchorY: mask.anchorY,
      bitmap: { width: mask.width, height: mask.height, pixels } };
    placementMasks.set(mask, result);
  }
  return result;
}

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
      type: 1,
      x: 0,
      y: 0,
      mask: terrainMask,
      enabled: 1,
      overlap: 0,
    });
    this.allBodies={capacity:16,entries:[this.rows[1][0]]};
    this.categoryCapacity=Array(32).fill(16);
    this.dirtyLists=new Set();
    this.spareLists=Array.from({length:33},()=>[]);
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

  //004C9460 leaves holes in both lists. Fresh/body-state registration uses
  //negative saved indices, so004C8F80 appends instead of filling those holes.
  removeBody(body) {
    for(const type of [body.type,32]) {
      const row=type===32?this.allBodies.entries:this.rows[type];
      const index=row?.indexOf(body) ?? -1;
      if(index>=0) {row[index]=null;this.dirtyLists.add(type);}
    }
    this.manager.cache=null;
  }

  //End-of-frame004CA7E0, after actor changes. Clean lists and overlap caches
  //are unchanged; only dirty backing lists swap, retaining membership order.
  finishFrame() {
    for(const type of [32,...Array.from({length:32},(_,i)=>i)]) {
      if(!this.dirtyLists.has(type))continue;
      const source=type===32?this.allBodies.entries:this.rows[type],target=this.spareLists[type];
      const count=nativeCompactPhysicsEntries(source.length,index=>source[index],(index,body)=>{target[index]=body;});
      target.length=count;
      if(type===32)this.allBodies.entries=target;else this.rows[type]=target;
      this.spareLists[type]=source;
    }
    this.dirtyLists.clear();
  }

  registerBody(body,type) {
    const result=nativeRestorePhysicsMembership({id:body,all:this.allBodies,
      category:{capacity:this.categoryCapacity[type],entries:this.rows[type]},
      allIndex:-1,categoryIndex:-1,links:[],linkIndex:0});
    this.allBodies=result.all;this.rows[type]=result.category.entries;
    this.categoryCapacity[type]=result.category.capacity;
    body.type=type;this.manager.cache=null;
  }

  syncWorms(worms) {
    if(worms.length!==this.worms.length || worms.some((w,i)=>w!==this.worms[i])) {
      const previous=new Map(this.worms.map((w,i)=>[w,this.wormBodies[i]]));
      const retained=new Set(worms);
      for(const [w,body] of previous)if(!retained.has(w))this.removeBody(body);
      this.worms=[...worms];
      this.wormBodies=worms.map((w,i)=>{
        const body=previous.get(w)??{type:-1,shape:3,mask:shapes.shapes[3],overlap:0};
        body.id=i+2;return body;
      });
      this.manager.cache=null;
    }
    worms.forEach((w, i) => {
      const body = this.wormBodies[i];
      const type = nativeWormCollisionType(nativeWormState(w));
      if (body.type !== type) {
        if(body.type>=0)this.removeBody(body);
        this.registerBody(body,type);
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
      this.removeBody(actor);
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
        if(actor.type>=0)this.removeBody(actor);
        this.registerBody(actor,body.type);
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

  //Placement queries already use native Y-down signed16.16 coordinates.
  probe(shape, x, y, flags) {
    return this.manager.probe(shapes.shapes[shape],x,y,flags)?.id ?? 0;
  }

  nearest(x, y, flags) {
    return nativeNearestBody(this.allBodies.entries,x,y,flags,{
      type:body=>body.type,position:body=>body,
    });
  }

  // Snapshot the same ordered bodies used by movement into primary bitmaps
  // for004C9500. Rebuild terrain each request: craters and water mutate it.
  // Host terrain rows point upward; native masks and sprites point downward.
  placementRegistry(width) {
    const height = this.height, pixels = new Uint8Array(width * height);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        pixels[y * width + x] = Number(this.terrain.solid(x, height - 1 - y));
    const terrainMask = { width, height, anchorX: 0, anchorY: 0,
      bitmap: { width, height, pixels } };
    return this.rows.map((row, type) => row.map(body => body && ({
      ...body, mask: type === 1 ? terrainMask : placementMask(body.mask),
    })));
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

//The live host calls this after its frame tasks, before queued audio. Synchronize
//final removals/state changes even if no collision query followed them.
export function nativeFinishSceneCollisionFrame(terrain,worms,objects=[]) {
  const scene=scenes.get(terrain);
  if(!scene)return;
  scene.syncWorms(worms);scene.syncObjects(objects);scene.finishFrame();
}
