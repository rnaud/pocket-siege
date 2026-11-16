import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { nativeWormTransitionBody } from "../src/armageddon/worm-state.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/worm-state.json", import.meta.url),
  ),
);

test("worm transition body preparation matches original setters and effect order", () => {
  expect(fixture.cases).toHaveLength(4332);
  for (const v of fixture.cases) {
    expect(
      nativeWormTransitionBody(v.input, v.next, v.environment),
      JSON.stringify(v),
    ).toEqual(v.result);
  }
});

import { nativeWormJumpLandingEntry } from "../src/armageddon/worm-state.js";
test("jump/landing entries match native sprite selection, voices and velocity-based sound", () => {
  expect(fixture.jump_landing_entries).toHaveLength(480);
  for (const v of fixture.jump_landing_entries) {
    expect(
      nativeWormJumpLandingEntry(v.input, v.next, v.environment),
      JSON.stringify(v),
    ).toEqual(v.result);
  }
});
