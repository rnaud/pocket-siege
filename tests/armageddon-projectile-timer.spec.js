import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/projectile-timer.json" with { type: "json" };
import { nativeProjectileTimer, nativeProjectileSoundTick } from "../src/armageddon/projectile-timer.js";

test("projectile fuse, delayed detonation and warning boundaries match the original", { tag: "@logic" }, () => {
  for (const c of fixture.soundCases) {
    const calls = [];
    const output = nativeProjectileSoundTick(c.body, {
      finished: handle => { calls.push({ operation: "finished", request: [handle] }); return c.finished; },
      start: request => { calls.push({ operation: "start", request }); return c.started; },
      stop: handle => calls.push({ operation: "stopSound", request: [handle] }),
    });
    expect(output).toEqual(c.output);
    expect(calls).toEqual(c.calls);
  }
  expect(fixture.cases).toHaveLength(1320);
  for (const [index,c] of fixture.cases.entries()) {
    expect(nativeProjectileTimer(c.body, {
      ...c.environment, random: () => c.environment.random,
    }), `case ${index}`).toEqual({ body: c.output, calls: c.calls });
  }
});
