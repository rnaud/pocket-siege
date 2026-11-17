import { test, expect } from "@playwright/test";
import masks from "./fixtures/armageddon/collision-mask.json" with { type: "json" };
import fixture from "./fixtures/armageddon/collision-registry.json" with { type: "json" };
import { NativeCollisionRegistry } from "../src/armageddon/collision-registry.js";

test("collision registry preserves native candidate order and overlap cache transitions", { tag: "@logic" }, () => {
  const mask = masks.cases.find((m) => m.shape === 3);
  for (const [index, scenario] of fixture.cases.entries()) {
    const bodies = new Map(scenario.initial.map((b) => [b.id, { ...b, mask }]));
    const registry = new NativeCollisionRegistry(
      scenario.registry.map((ids) => ids.map((id) => bodies.get(id) ?? null)),
    );
    for (const [step, r] of scenario.steps.entries()) {
      for (const [id, values] of Object.entries(r.changes))
        Object.assign(bodies.get(Number(id)), values);
      const hit = registry.query(bodies.get(r.actor), r.x, r.y, mask, r.flags);
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
