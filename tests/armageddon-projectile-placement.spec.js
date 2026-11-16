import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/projectile-placement.json" with { type: "json" };
import { nativeProjectilePlacement } from "../src/armageddon/projectile-placement.js";

test("native constructor placement accepts coordinates or detonates before deletion", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(12);
  for (const c of fixture.cases) {
    const calls = [];
    const result = nativeProjectilePlacement({ sleeping: 7 }, c.x, c.y, (body,x,y) => {
      calls.push({ operation: "probe", request: [x,y], origin: [body.x,body.y] });
      return c.hit;
    });
    expect([...calls,...result.calls]).toEqual(c.calls);
    expect([result.body.x,result.body.y]).toEqual(c.position);
    expect(result.body.sleeping).toBe(c.sleeping);
  }
});
