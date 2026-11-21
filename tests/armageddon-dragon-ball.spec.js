import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/dragon-ball.json" with { type: "json" };
import hitFixture from "./fixtures/armageddon/dragon-ball-hit.json" with { type: "json" };
import bodyFixture from "./fixtures/armageddon/dragon-ball-body.json" with { type: "json" };
import { nativeDragonBallBody, nativeDragonBallEvent, nativeDragonBallHit } from "../src/armageddon/dragon-ball.js";

test("Dragon Ball task events match original motion, expiry and dispatch order", { tag: "@logic" }, () => {
  for (const row of bodyFixture.cases)
    expect(nativeDragonBallBody(row.record, row.launch)).toEqual(row.output);
  for (const row of fixture.cases) {
    expect(nativeDragonBallEvent(row.body, row.event, row.bounds, {
      hit: () => row.hit, solid: () => row.solid,
    })).toEqual(row.output);
  }
});

test("Dragon Ball hit scan matches original ordered categories, bounds and impulse", { tag: "@logic" }, () => {
  for (const row of hitFixture.cases)
    expect(nativeDragonBallHit(row.body, row.receivers)).toEqual(row.output);
});
