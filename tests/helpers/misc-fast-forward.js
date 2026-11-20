// Runs the live match faster than real time while still rendering every
// animation frame: each requestAnimationFrame the game renders, the probe
// samples getState(), then `perFrame` extra 20 ms logic ticks are stepped
// synchronously. Render-only fields (worm sprites, poses) stay observable as
// long as each pose lasts longer than `perFrame` ticks.
// `until` and `sample` are serialised and evaluated in the page with the
// current getState() snapshot.
export function fastForward(page, until, { perFrame = 4, maxTicks = 3000, sample = null } = {}) {
  return page.evaluate(
    ({ until, sample, perFrame, maxTicks }) =>
      new Promise((resolve, reject) => {
        const done = (0, eval)(`(${until})`);
        const probe = sample ? (0, eval)(`(${sample})`) : null;
        const samples = [];
        let ticks = 0;
        const tick = () => {
          const state = window.siege.getState();
          if (probe) samples.push(probe(state));
          if (done(state)) return resolve({ ticks, samples, state });
          if (ticks >= maxTicks) return reject(new Error(`condition not reached after ${ticks} extra ticks`));
          window.siege.debug.advanceReplayFrames(perFrame);
          ticks += perFrame;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { until: until.toString(), sample: sample?.toString() ?? null, perFrame, maxTicks },
  );
}

// Steps `count` logic ticks synchronously, then waits one animation frame so
// render-derived state matches the simulation.
export function advance(page, count) {
  return page.evaluate(
    (count) =>
      new Promise((resolve) => {
        window.siege.debug.advanceReplayFrames(count);
        requestAnimationFrame(() => resolve());
      }),
    count,
  );
}
