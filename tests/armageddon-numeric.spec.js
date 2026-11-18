import { test, expect } from "@playwright/test";
import fs from "node:fs";
import {
  fixedMultiply,
  fixedDivide,
  nextLogicRandom,
  nextVisualRandom,
} from "../src/armageddon/numeric.js";
import { MatchRandom } from "../src/armageddon/random.js";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/armageddon/numeric.json", import.meta.url),
  ),
);

test("numeric port matches 317 cases executed by original x86 routines", { tag: "@logic" }, () => {
  let logic, visual;
  for (const v of fixture.vectors) {
    if (v.kind === "rng") {
      if (v.index === 0) logic = visual = v.seed;
      logic = nextLogicRandom(logic, v.frame);
      visual = nextVisualRandom(visual);
      expect(logic).toBe(v.logic);
      expect(visual).toBe(v.visual);
    } else
      expect(
        v.kind === "mul" ? fixedMultiply(v.a, v.b) : fixedDivide(v.a, v.b),
      ).toBe(v.result);
  }
  expect(fixture.vectors).toHaveLength(317);
  expect(() => fixedDivide(1, 0)).toThrow(RangeError);
  expect(() => fixedDivide(0x7fffffff, 1)).toThrow(RangeError);
});

test("cosmetic draws cannot change gameplay randomness; snapshots resume exactly", { tag: "@logic" }, () => {
  const a = new MatchRandom(78961),
    b = new MatchRandom(78961);
  for (let frame = 0; frame < 100; frame++) {
    for (let i = 0; i < 17; i++) a.visualUint();
    expect(a.logicUint()).toBe(b.logicUint());
    a.finishFrame();
    b.finishFrame();
  }
  const restored = new MatchRandom(0);
  restored.restore(a.snapshot());
  expect(restored.logicUint()).toBe(a.logicUint());
  expect(restored.visualUint()).toBe(a.visualUint());
});

test("seeded live match reproduces initial wind, crates and hazards", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const sample = async () =>
    page.evaluate(async () => {
      await window.siege.debug.resetSeed(78961);
      const s = window.siege.getState();
      return {
        seed: s.mapSeed,
        wind: s.wind,
        crate: s.crate,
        hazards: s.hazards,
        worms: s.worms.map((w) => [w.x, w.y, w.hp]),
        random: s.random,
        tick: s.logicStepMs,
      };
    });
  const first = await sample();
  await page.evaluate(() => window.siege.debug.consumeVisualRandom(1000));
  expect(await sample()).toEqual(first);
  expect(first.tick).toBe(20);
});
