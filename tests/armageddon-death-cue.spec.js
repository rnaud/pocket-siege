import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/death-cue.json" with { type: "json" };
import { nativeDeathCue, nativeDeathEntry, nativeNextDeath, nativeRequestedDeathState } from "../src/armageddon/death-cue.js";
test("death voice threshold, random consumption and completion match original x86", { tag: "@logic" }, () => {
  expect(fixture.cases).toHaveLength(216);
  expect(fixture.requests).toHaveLength(192);
  for (const row of fixture.requests) expect(nativeRequestedDeathState(row.request, row.state, row.body)).toBe(row.result);
  expect(fixture.selections).toHaveLength(194);
  for (const row of fixture.selections) expect(nativeNextDeath(row.teams)).toEqual(row.result);
  for (const row of fixture.entries) expect(nativeDeathEntry(row.input)).toEqual(row.result);
  for (const row of fixture.cases) {
    let calls = 0;
    const result = nativeDeathCue(row.sprite, row.progress, row.spoken, () => {
      calls++;
      return row.random;
    });
    expect(result).toEqual(row.result);
    expect(calls).toBe(row.result.randomCalls);
  }
});
test("native death playback emits one original English voice at the animation threshold", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  const result = await page.evaluate(async () => {
    const { startOriginalDeath, stepOriginalDeath } =
      await import("/src/armageddon/art.js");
    const { playNativeDeathVoice } = await import("/src/armageddon/audio.js");
    const { nativeWormState } = await import("/src/armageddon/worm-collision-type.js");
    const events = [],
      starts = [],
      bytes = [];
    const context = {
      destination: {},
      decodeAudioData: async (data) => {
        bytes.push(data.byteLength);
        return {};
      },
      createGain: () => ({ gain: { value: 0 }, connect() {}, disconnect() {} }),
      createBufferSource: () => ({
        connect() {},
        disconnect() {},
        start() {
          starts.push(true);
        },
      }),
    };
    for (const random of [0, 0x10000]) {
      const worm = { vx: 100, vy: -200, frozen: true,
        nativeHurtBody: { state: 0x80, vx: 1000, vy: -2000, angularVelocity: 123, suspended: 0 } };
      startOriginalDeath(worm);
      if (worm.vx || worm.vy || worm.nativeHurtBody.vx || worm.nativeHurtBody.vy ||
          worm.nativeHurtBody.angularVelocity || !worm.nativeHurtBody.suspended || nativeWormState(worm) !== 0x84)
        throw new Error('Death entry did not stop and suspend the native body');
      let calls = 0,
        ticks = 0,
        previous = 0;
      while (ticks++ < 100) {
        const complete = stepOriginalDeath(worm, () => {
          calls++;
          return random;
        });
        if (worm.originalDeathVoice) {
          events.push({
            sound: worm.originalDeathVoice[0],
            previous,
            progress: worm.originalDeath.current.progress,
          });
          playNativeDeathVoice(context, worm.originalDeathVoice);
        }
        previous = worm.originalDeath.current.progress;
        if (complete) break;
      }
      if (calls !== 1) throw new Error(`RNG called ${calls} times`);
    }
    const deadline = performance.now() + 2000;
    while (starts.length < 2 && performance.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 10));
    return { events, starts: starts.length, bytes };
  });
  expect(result.events.map((event) => event.sound)).toEqual([33, 6]);
  for (const event of result.events) {
    expect(event.previous).toBeLessThanOrEqual(0x435d);
    expect(event.progress).toBeGreaterThan(0x435d);
  }
  expect(result.starts).toBe(2);
  expect(result.bytes.every((size) => size > 44)).toBe(true);
});
