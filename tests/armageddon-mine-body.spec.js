import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/mine-body.json" with { type: "json" };
import { nativeMineBase, nativeMineBody } from "../src/armageddon/mine-body.js";
test("mine base fields and physical setup match original constructors", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(72);
  for (const [i, c] of fixture.cases.entries()) {
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
