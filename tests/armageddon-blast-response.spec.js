import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/blast-response.json" with { type: "json" };
import { nativeBlastResponse } from "../src/armageddon/blast-response.js";
test("worm blast exclusions, frozen velocity, damage modifier and hurt state match native handler", { tag: "@logic" }, () => {
  for (const row of fixture.cases)
    expect(
      nativeBlastResponse(
        {
          state: row.state,
          vx: row.vx,
          vy: row.vy,
          fieldB0: row.flag,
          accumulated: 7,
          facing: 1,
        },
        row.damage,
        row.probe,
      ),
    ).toEqual({ result: row.result, output: row.output });
});
