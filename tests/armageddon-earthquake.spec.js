import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/earthquake.json" with { type: "json" };
import { nextLogicRandom } from "../src/armageddon/numeric.js";
import {
  nativeEarthquakeStart, nativeEarthquakeTick, nativeEarthquakeKick, nativeWormEarthquakeResponse,
} from "../src/armageddon/earthquake.js";

const strip = ({ busy, shake, quake, started, ...body }) => body;

test("earthquake start matches the original event 0x445", { tag: "@logic" }, () => {
  // The English announcement table is empty: nothing is shown and no random is drawn.
  expect(fixture.messages).toEqual([]);
  expect(fixture.starts).toHaveLength(60);
  for (const row of fixture.starts) {
    const { body, calls } = nativeEarthquakeStart(row.input, row.duration);
    expect(body).toEqual(row.result.body);
    expect(calls).toEqual(row.result.calls);
    expect(row.result.random).toBe(row.seed);
  }
});

test("earthquake tick matches the original world frame", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(1344);
  for (const row of fixture.cases) {
    const result = nativeEarthquakeTick(row.input, (request) => (request[0] === 0x10004 ? 401 : 402));
    expect(result).toEqual(row.result);
  }
  // A full 8-second quake rises, peaks and settles back to rest.
  let body = nativeEarthquakeStart({ strength: 0, target: 0, progress: -1, duration: 0, handleA: 0, handleB: 0,
    shake: 0, busy: 0, quake: 0, started: 0 }, 8).body;
  let peak = 0, frames = 0;
  do { body = nativeEarthquakeTick(body, () => 1).body; peak = Math.max(peak, body.strength); frames++; }
  while (body.strength && frames < 1000);
  expect(strip(body)).toMatchObject({ strength: 0, progress: -1 });
  expect(peak).toBe(0x10000);
  expect(frames).toBeGreaterThan(400);
});

test("earthquake kicks match the original body routine", { tag: "@logic" }, () => {
  expect(fixture.kicks).toHaveLength(144);
  for (const row of fixture.kicks) {
    let random = row.seed;
    const kick = nativeEarthquakeKick(row.strength, row.submerged, () => (random = nextLogicRandom(random, row.frame)));
    expect(kick ? [{ operation: "impulse", ...kick }] : []).toEqual(row.result.calls);
    expect(random >>> 0).toBe(row.result.random);
  }
});

test("worms enter flight from an earthquake kick like the original", { tag: "@logic" }, () => {
  expect(fixture.responses).toHaveLength(333);
  for (const row of fixture.responses) {
    const result = nativeWormEarthquakeResponse(row.state, row.vx, row.vy, row.x, row.y);
    expect(result.state === null ? [] : [{ operation: "state", state: result.state }]).toEqual(row.result.calls);
    expect([result.vx, result.vy]).toEqual([row.result.vx, row.result.vy]);
  }
});
