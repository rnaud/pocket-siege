// Drive the live simulation synchronously at the native 20 ms logic step
// instead of waiting for real time. `predicate` runs in the page with the
// current window.siege.getState() (and `arg`); stepping stops as soon as it
// returns true. Resolves to the number of logic frames advanced, or throws
// after `max` frames so a hang fails quickly with a clear message.
export async function advanceUntil(page, predicate, { max = 1500, arg, label = "condition" } = {}) {
  const started = Date.now();
  const frames = await page.evaluate(
    ({ source, max, arg }) => {
      const test = (0, eval)(`(${source})`);
      for (let i = 0; i <= max; i++) {
        if (test(window.siege.getState(), arg)) return i;
        window.siege.debug.advanceReplayFrames(1);
      }
      return -1;
    },
    { source: predicate.toString(), max, arg },
  );
  if (process.env.MISC_PROFILE) console.log(`[advanceUntil] ${label}: ${frames} frames in ${Date.now() - started} ms`);
  if (frames < 0) throw new Error(`${label} not reached within ${max} logic frames`);
  return frames;
}

// Advance a fixed number of logic frames, then wait for one rendered frame so
// presentation state that the render loop derives (worm sprites, poses) syncs.
export async function advanceFrames(page, count) {
  await page.evaluate(async (count) => {
    window.siege.debug.advanceReplayFrames(count);
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }, count);
}
