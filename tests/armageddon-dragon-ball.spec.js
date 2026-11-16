import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/dragon-ball.json" with { type: "json" };
import { nativeDragonBallEvent } from "../src/armageddon/dragon-ball.js";

test("Dragon Ball task events match original motion, expiry and dispatch order", { tag: "@logic" }, () => {
  for (const row of fixture.cases) {
    expect(nativeDragonBallEvent(row.body, row.event, row.bounds, {
      hit: () => row.hit, solid: () => row.solid,
    })).toEqual(row.output);
  }
});
