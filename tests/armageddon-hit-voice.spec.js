import { test, expect } from "./helpers/shared-page.js";
import fixture from "./fixtures/armageddon/hit-voice.json" with { type: "json" };
import { nativeHitVoice } from "../src/armageddon/hit-voice.js";
import { nextLogicRandom } from "../src/armageddon/numeric.js";

test("hit voice cooldown, selection and RNG match original receiver", { tag: "@logic" }, () => {
  for (const row of fixture.cases) {
    let random = row.seed;
    const request = nativeHitVoice(
      row.frame,
      row.last,
      () => (random = nextLogicRandom(random, row.frame)),
    );
    const calls = request
      ? [
          { lookup: [2, request.index] },
          ...(row.handle ? [{ stop: row.handle }] : []),
          { play: [0x10000 + request.index, 3, 65536, 65536, 0] },
        ]
      : [];
    expect(calls).toEqual(row.calls);
    expect(request?.frame ?? row.last).toBe(row.resultFrame);
    expect(request ? 1234 : row.handle).toBe(row.resultHandle);
    expect(random).toBe(row.random);
  }
});

test("hit voice adapter plays original clips and cancels a pending previous voice", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { playNativeHitVoice } = await import("/src/armageddon/audio.js");
    const started = [],
      pending = [],
      stopped = [];
    const context = {
      destination: {},
      decodeAudioData: async () =>
        new Promise((resolve) => pending.push(resolve)),
      createBufferSource: () => ({
        connect() {},
        disconnect() {},
        start() {
          started.push(this.buffer);
        },
        stop() {
          stopped.push(this.buffer);
          this.onended?.();
        },
      }),
      createGain: () => ({ gain: {}, connect() {}, disconnect() {} }),
    };
    // Decoder completion is controlled below; exclude the unrelated stale-audio
    // wall-clock cutoff so a slow CI asset fetch cannot change this assertion.
    const realNow = performance.now.bind(performance);
    const requested = realNow();
    performance.now = () => requested;
    const a = playNativeHitVoice(context, { index: 38 });
    const b = playNativeHitVoice(context, { index: 39 }, a);
    // Wait for both real asset fetches to reach the controlled decoder.
    while (pending.length < 2)
      await new Promise((resolve) => setTimeout(resolve, 10));
    pending[0]("first");
    pending[1]("second");
    await new Promise((resolve) => setTimeout(resolve, 0));
    b.stop();
    performance.now = realNow;
    return { started: started.length, stopped: stopped.length };
  });
  expect(result).toEqual({ started: 1, stopped: 1 });
});
