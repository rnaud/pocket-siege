import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { nativeWormTransitionBody } from "../src/armageddon/worm-state.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/worm-state.json", import.meta.url),
  ),
);

test("worm transition body preparation matches original setters and effect order", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(4332);
  for (const v of fixture.cases) {
    expect(
      nativeWormTransitionBody(v.input, v.next, v.environment),
      JSON.stringify(v),
    ).toEqual(v.result);
  }
});

import { nativeWormJumpLandingEntry } from "../src/armageddon/worm-state.js";
test("jump/landing entries match native sprite selection, voices and velocity-based sound", { tag: "@logic" }, () => {
  expect(fixture.jump_landing_entries).toHaveLength(480);
  for (const v of fixture.jump_landing_entries) {
    expect(
      nativeWormJumpLandingEntry(v.input, v.next, v.environment),
      JSON.stringify(v),
    ).toEqual(v.result);
  }
});

import { nativeWormTransitionFinalize } from "../src/armageddon/worm-state.js";
const finalization = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/worm-finalize.json", import.meta.url),
  ),
);
test("worm transition finalization preserves native event and scheduler decisions", { tag: "@logic" }, () => {
  expect(finalization.cases).toHaveLength(7220);
  for (const v of finalization.cases) {
    expect(
      nativeWormTransitionFinalize(v.input, v.previous, v.next, v.timer),
      JSON.stringify(v),
    ).toEqual(v.result);
  }
});

import { nativeWormJumpLandingTick } from "../src/armageddon/worm-state.js";
test("jump and landing ticks match native apex and animation completion boundaries", { tag: "@logic" }, () => {
  expect(finalization.jump_landing_ticks).toHaveLength(420);
  for (const v of finalization.jump_landing_ticks) {
    expect(
      nativeWormJumpLandingTick(v.state, v.sprite, v.progress, v.vy),
      JSON.stringify(v),
    ).toEqual(v.result);
  }
});
