import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/worm-collision-type.json" with { type: "json" };
import { nativeWormCollisionType } from "../src/armageddon/worm-collision-type.js";

test("worm state collision categories match the original executable dispatch", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(260);
  for (const c of fixture.cases)
    expect(nativeWormCollisionType(c.state), `state ${c.state}`).toBe(c.type);
});
