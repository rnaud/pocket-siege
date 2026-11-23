import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/mole-burrow.json" with { type: "json" };
import { nextLogicRandom } from "../src/armageddon/numeric.js";
import { nativeMoleBurrow, nativeDirtSpray } from "../src/armageddon/mole-burrow.js";

const color = (x, y) => ((x * 7 + y * 3) & 0xff);
const io = (solid, placed, seed, frame) => {
  let random = seed;
  return { test: (size, x, y) => solid(y), place: () => placed, color,
    random: () => (random = nextLogicRandom(random, frame)), seed: () => random >>> 0 };
};

test("mole burrow frames match the original 004E3570", { tag: "@logic" }, () => {
  expect(fixture.frames).toHaveLength(1152);
  for (const { input, result } of fixture.frames) {
    const { gravity, frame, solid, placed, water, seed, ...body } = input;
    const host = io(() => solid, placed, seed, frame);
    const tick = nativeMoleBurrow(body, { gravity, frame, water }, host);
    expect(tick.calls).toEqual(result.calls);
    expect(tick.body).toEqual(result.body);
    expect(host.seed()).toBe(result.random);
  }
});

test("whole mole burrows match the original", { tag: "@logic" }, () => {
  for (const burrow of fixture.burrows) {
    let body = burrow.input, random = 99;
    burrow.steps.forEach((step, frame) => {
      const tick = nativeMoleBurrow(body, { gravity: 0x3d70, frame, water: 600 }, {
        test: (size, x, y) => Number(y >= 210 && y < 260), place: () => 1, color,
        random: () => (random = nextLogicRandom(random, frame)),
      });
      expect(tick.calls).toEqual(step.calls);
      expect(tick.body).toEqual(step.body);
      body = tick.body;
    });
    expect(random >>> 0).toBe(burrow.random);
  }
});

test("dirt sprays match the original 004EDD10", { tag: "@logic" }, () => {
  for (const { input, result } of fixture.sprays) {
    let random = input.seed;
    const calls = nativeDirtSpray(input.x, input.y, input.angle, input.spread, input.distance, {
      color: (x, y) => ((x + y) % 3 === 0 ? 0 : (x ^ y) & 0xff),
      random: () => (random = nextLogicRandom(random, input.frame)) });
    expect(calls).toEqual(result.calls);
    expect(calls.length).toBe(result.count);
    expect(random >>> 0).toBe(result.random);
  }
});
