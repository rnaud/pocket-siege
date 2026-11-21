import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/debris.json" with { type: "json" };
import {
  nativeDebrisBurst,
  nativeDebrisBody,
  nativeDebrisTick,
} from "../src/armageddon/debris.js";
import { nextVisualRandom } from "../src/armageddon/numeric.js";
test("debris requests and capped-pool RNG match the original emitter", { tag: "@logic" }, () => {
  for (const row of fixture.emissions) {
    let state = row.seed;
    expect(
      nativeDebrisBurst(
        100 << 16,
        200 << 16,
        Math.trunc((row.strength << 16) / 8) + 2,
        Math.trunc(row.strength / 6),
        row.active,
        () => (state = nextVisualRandom(state)),
      ),
    ).toEqual(row.requests);
    expect(state).toBe(row.random);
  }
});
test("debris flight, smoke trails and retirement match native execution", { tag: "@logic" }, () => {
  for (const row of fixture.ticks) {
    let state = row.seed,
      body = { ...row.initial };
    expect(
      nativeDebrisBody([
        body.x,
        body.y,
        body.vx,
        body.vy,
        body.sprite,
        body.step,
      ]),
    ).toEqual(body);
    for (const frame of row.frames) {
      const { random, ...expected } = frame;
      const actual = nativeDebrisTick(
        body,
        0x3d70,
        row.water,
        () => (state = nextVisualRandom(state)),
      );
      expect(actual).toEqual(expected);
      expect(state).toBe(random);
      body = actual.body;
    }
  }
});
