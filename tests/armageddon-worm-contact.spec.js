import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { nativeWormAirborneContact } from "../src/armageddon/worm-contact.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/worm-contact.json", import.meta.url),
  ),
);
test("airborne contact matches native landing, ceiling and position-attempt decisions", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(7200);
  for (const v of fixture.cases) {
    const queries = [],entries=[];
    const result = nativeWormAirborneContact(
      v.input,
      v.otherType,
      v.side,
      v.environment,
      (x, y) => {
        queries.push([x, y]);
        return v.pattern[queries.length - 1];
      },
      (body,target)=>entries.push({previous:body.state,target,velocity:[body.vx,body.vy]}),
    );
    const expectedEntries = v.result.calls.filter(c=>c.operation==='state').map(c=>({previous:v.input.state,target:c.target,velocity:c.velocity}));
    // Full coverage with a cheap strict comparison; build the detailed
    // assertion (and its JSON message) only for a case that differs.
    if (!isDeepStrictEqual(entries, expectedEntries)) expect(entries).toEqual(expectedEntries);
    if (!isDeepStrictEqual({ result, queries }, { result: v.result, queries: v.queries }))
      expect({ result, queries }, JSON.stringify(v)).toEqual({
        result: v.result,
        queries: v.queries,
      });
  }
});

import { nativeWormAirborneCollision } from "../src/armageddon/worm-contact.js";
test("complete airborne callback matches receiver dispatch, bounce and facing update", { tag: "@logic" }, () => {
  expect(fixture.complete_callbacks).toHaveLength(14400);
  for (const v of fixture.complete_callbacks) {
    const queries = [];
    const result = nativeWormAirborneCollision(
      v.input,
      v.other,
      v.side,
      v.environment,
      (x, y) => {
        queries.push([x, y]);
        return v.pattern[(queries.length - 1) % v.pattern.length];
      },
      () => v.environment.otherResponse,
    );
    if (!isDeepStrictEqual({ result, queries }, { result: v.result, queries: v.queries }))
      expect({ result, queries }, JSON.stringify(v)).toEqual({
        result: v.result,
        queries: v.queries,
      });
  }
});
