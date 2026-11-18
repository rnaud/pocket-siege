import { nativeMineTimerFromRecord } from "../src/armageddon/mine-timer.js";
import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-body.json" with { type: "json" };
import { nativeSettleMineBody, nativeMineBase, nativeMineBody } from "../src/armageddon/mine-body.js";
test("mine base fields and physical setup match original constructors", { tag: "@logic" }, () => {
  for(const c of fixture.settleCases) {
    const queries=[],slopeCalls=[];
    const after=nativeSettleMineBody(c.before,c,c.water,(x,y,b)=>{queries.push([x,y,b.flags]);return c.hit;},(x,y,width)=>{slopeCalls.push([x,y,width]);return c.slope;});
    expect({after,queries,slopeCalls}).toEqual({after:c.after,queries:c.queries,slopeCalls:c.slopeCalls});
  }
  expect(fixture.cases).toHaveLength(72);
  for (const [i, c] of fixture.cases.entries()) {
    expect(nativeMineTimerFromRecord(c.record,c.placed)).toEqual(c.timer);
    expect(nativeMineBase(c.friction), `base ${i}`).toEqual(c.before);
    const queries = [];
    expect(
      nativeMineBody(c.before, c, c.arm, c.friction, (x, y, b) => {
        queries.push([x, y, b.flags]);
        return c.hit;
      }),
      `case ${i}`,
    ).toEqual(c.after);
    expect(queries).toEqual(c.queries);
  }
});
