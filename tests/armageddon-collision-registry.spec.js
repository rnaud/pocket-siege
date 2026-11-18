import probeFixture from './fixtures/armageddon/collision-probe.json' with { type: 'json' };
import { test, expect } from "@playwright/test";
import masks from "./fixtures/armageddon/collision-mask.json" with { type: "json" };
import fixture from "./fixtures/armageddon/collision-registry.json" with { type: "json" };
import { NativeCollisionRegistry } from "../src/armageddon/collision-registry.js";

test("collision registry preserves native candidate order and overlap cache transitions", { tag: "@logic" }, () => {
  const mask = masks.cases.find((m) => m.shape === 3);
  for (const [index, scenario] of [...fixture.cases,...probeFixture.cases].entries()) {
    const bodies = new Map(scenario.initial.map((b) => [b.id, { ...b, mask }]));
    const registry = new NativeCollisionRegistry(
      scenario.registry.map((ids) => ids.map((id) => bodies.get(id) ?? null)),
    );
    for (const [step, r] of scenario.steps.entries()) {
      for (const [id, values] of Object.entries(r.changes))
        Object.assign(bodies.get(Number(id)), values);
      const hit = index < fixture.cases.length ? registry.query(bodies.get(r.actor), r.x, r.y, mask, r.flags) : registry.probe(mask,r.x,r.y,r.flags);
      expect(
        {
          result: hit?.id ?? 0,
          overlaps: [...bodies.values()].map((body) => body.overlap),
        },
        `scenario ${index}, query ${step}`,
      ).toEqual({ result: r.result, overlaps: r.overlaps });
    }
  }
});


test("barrel registry respects masks, self exclusion, removal and live body positions", { tag: "@logic" }, async () => {
  const { nativeSceneCollision, nativeSceneObject } = await import("../src/armageddon/collision-scene.js");
  const { NativeCollisionScene } = await import('../src/armageddon/collision-scene.js');
  const { nativeCrateSpawnSearch } = await import('../src/armageddon/crate-spawn-search.js');
  const ordered=new NativeCollisionScene({solid:()=>false},650);
  const a={x:200,y:450,hp:100},b={x:200,y:450,hp:100};
  ordered.syncWorms([a,b]);
  expect(ordered.probe(3,200<<16,200<<16,1<<2)).toBe(2);
  a.originalHurt={state:0x80};ordered.syncWorms([a,b]);
  a.originalHurt=null;ordered.syncWorms([a,b]);
  expect(ordered.rows[2].map(body=>body?.id??null)).toEqual([null,3,2]);
  expect(ordered.probe(3,200<<16,200<<16,1<<2)).toBe(3);
  const retained=ordered.wormBodies[1];ordered.syncWorms([b]);
  expect(ordered.wormBodies[0]).toBe(retained);
  expect(ordered.allBodies.entries.filter(Boolean)).toEqual([ordered.rows[1][0],retained]);
  const object=()=>({nativeBody:{type:17,shape:9,enabled:1,x:300<<16,y:200<<16}});
  const first=object(),second=object(),third=object();
  ordered.syncObjects([first,second]);const secondId=ordered.objects.get(second).id;
  ordered.syncObjects([second]);ordered.syncObjects([second,third]);
  expect(ordered.rows[17][0]).toBeNull();
  expect(ordered.probe(3,300<<16,200<<16,1<<17)).toBe(secondId);

  const cleanTerrainRow=ordered.rows[1],oldObjectRow=ordered.rows[17];
  const cache={sentinel:true};ordered.manager.cache=cache;
  ordered.finishFrame();
  expect(ordered.rows[1]).toBe(cleanTerrainRow);
  expect(ordered.rows[17]).not.toBe(oldObjectRow);
  expect(ordered.rows[17].map(body=>body.id)).toEqual([secondId,ordered.objects.get(third).id]);
  expect(ordered.rows[2]).toEqual([retained]);
  expect(ordered.allBodies.entries).toEqual([cleanTerrainRow[0],retained,ordered.objects.get(second),ordered.objects.get(third)]);
  expect(ordered.manager.cache).toBe(cache);
  expect(ordered.probe(3,300<<16,200<<16,1<<17)).toBe(secondId);
  const compacted=ordered.rows[17];ordered.finishFrame();expect(ordered.rows[17]).toBe(compacted);
  for(let i=0;i<100;i++) {
    b.originalHurt={state:0x80};ordered.syncWorms([b]);
    b.originalHurt=null;ordered.syncWorms([b]);ordered.finishFrame();
    expect(ordered.allBodies.entries.length).toBe(4);
    expect(ordered.rows[2]).toEqual([retained]);expect(ordered.rows[3]).toEqual([]);
  }

  const ground = new NativeCollisionScene({solid:(x,y)=>x>=0 && x<1920 && y<150},650);
  const barrelAtGround={nativeBody:{type:17,shape:9,enabled:1,x:960<<16,y:480<<16}};
  ground.syncObjects([barrelAtGround]);
  expect(ground.probe(5,960<<16,500<<16,2)).toBe(1);
  expect(ground.probe(5,960<<16,200<<16,2)).toBe(0);
  expect(ground.nearest(960<<16,480<<16,0x21c04)).toBe(0);
  let random=12345;
  const placement=nativeCrateSpawnSearch(600,0,1,1,{
    random:()=>random=(Math.imul(random,1664525)+1013904223)>>>0,
    collide:(...args)=>ground.probe(...args),nearest:(...args)=>ground.nearest(...args),
  });
  expect(placement.success).toBe(true);
  expect(ground.probe(5,placement.x,placement.y,0x1806)).toBe(0);
  expect(ground.probe(5,placement.x,placement.y+0x80000,0x1806)).not.toBe(0);
  expect(ground.nearest(placement.groundX,placement.groundY,0x21c04)).toBeGreaterThanOrEqual(0x400000);
  ground.syncObjects([]);
  expect(ground.nearest(960<<16,480<<16,0x21c04)).toBeNull();
  const terrain = { solid: () => false }, height = 650;
  const barrel = { nativeBody: { type: 17, shape: 9, enabled: 1,
    x: 200 << 16, y: 200 << 16, flags: 1 << 17 } };
  const identity = {}, body = { x: 100 << 16, y: 200 << 16, shape: 3, flags: 1 << 17 };
  const query = (objects = [barrel]) => nativeSceneCollision(identity, body, 200, 450, terrain, [], height, objects);
  const hit = query();
  expect(hit).toBeLessThan(0);
  expect(nativeSceneObject(terrain, hit)).toBe(barrel);
  expect(nativeSceneCollision(barrel, barrel.nativeBody, 200, 450, terrain, [], height, [barrel])).toBe(0);
  body.flags = 2;
  expect(query()).toBe(0);
  body.flags = 1 << 17;
  barrel.nativeBody.enabled = 0;
  expect(query()).toBe(0);
  barrel.nativeBody.enabled = 1;
  barrel.nativeBody.x = 300 << 16;
  expect(query()).toBe(0);
  barrel.nativeBody.x = 200 << 16;
  expect(query()).toBe(hit);
  expect(query([])).toBe(0);
  expect(nativeSceneObject(terrain, hit)).toBeNull();
  // A newly registered body already overlapping the actor is ignored until
  // the actor moves and refreshes the native overlap cache.
  body.x = 200 << 16;
  expect(query()).toBe(0);
  body.x = 100 << 16;
  expect(query()).toBeLessThan(0);
});
