import { test, expect } from "@playwright/test";
import fixture from "./fixtures/armageddon/direct-hit-response.json" with { type: "json" };
import { nativeDirectHitResponse } from "../src/armageddon/direct-hit-response.js";

test("direct-hit receiver matches original exclusions, repetition, blood and health requests", { tag: "@logic" }, () => {
  for (const row of fixture.cases) {
    expect(
      nativeDirectHitResponse(
        {
          state: row.state,
          fieldB0: row.flag,
          seen: row.seen,
          vx: -30000,
          vy: 500000,
          x: 100000,
          y: 200000,
          accumulated: 7,
          kind6: 0,
          delay: 9,
          kind1: 0,
          hits: 2,
        },
        [row.kind, 300000, 400000, 1234, 5678, row.damage],
        13,
      ),
    ).toEqual({ result: row.result, output: row.output });
  }
});
