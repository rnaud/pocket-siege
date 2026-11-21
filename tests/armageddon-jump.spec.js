import { test, expect } from "./helpers/shared-page.js";
import fs from "node:fs";
import { nativeWormJumpLaunch } from "../src/armageddon/jump.js";
const fixture = JSON.parse(
  fs.readFileSync(new URL("./fixtures/armageddon/jump.json", import.meta.url)),
);
test("jump launch matches native preparation gate, trig, impulse and inherited motion", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(1680);
  for (const v of fixture.cases) {
    if (v.error) {
      expect(() =>
        nativeWormJumpLaunch(
          v.progress,
          v.direction,
          v.backflip,
          v.facing,
          v.body,
        ),
      ).toThrow(RangeError);
      continue;
    }
    expect(
      nativeWormJumpLaunch(
        v.progress,
        v.direction,
        v.backflip,
        v.facing,
        v.body,
      ),
      JSON.stringify(v),
    ).toEqual(v.result);
  }
});
