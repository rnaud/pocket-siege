import { test, expect } from "./helpers/shared-page.js";
import { nativePrepareMapSpawns } from "../src/armageddon/map-setup.js";
import fixture from "./fixtures/armageddon/map-objects.json" with { type: "json" };
import { nativeMapObjects } from "../src/armageddon/map-objects.js";

test("natural mine/barrel placement matches original selection, packets and RNG", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(288);
  for (const [i, c] of fixture.cases.entries()) {
    let seed = c.seed;
    const sceneMemory=new Uint8Array(0x12420),scene=new DataView(sceneMemory.buffer);
    scene.setUint32(0x1241c,seed,true);
    const prepared=c.buildPool?nativePrepareMapSpawns(fixture.points.map(p=>({x:p.position>>>16,y:p.position&65535})),c,sceneMemory):null;
    const result = prepared ? {calls:prepared.objects,remaining:prepared.spawnPool} : nativeMapObjects(
      fixture.points,
      c,
      () => (seed = (Math.imul(seed, 0x19660d) + 0x3c6ef35f) >>> 0),
    );
    expect(result, `case ${i}`).toEqual({
      calls: c.calls,
      remaining: c.remaining,
    });
    if(prepared)seed=scene.getUint32(0x1241c,true);
    expect(seed, `random ${i}`).toBe(c.randomState);
  }
});
