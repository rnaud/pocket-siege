// Fast, deterministic test opening. One page.evaluate replaces the usual
// front-end clicks (mode, map select, START, reseed) and steps logic frames to
// the first aim instead of waiting for them in real time.
//
// With `manualClock: true` the render loop keeps drawing but no longer steps
// the simulation: only window.siege.debug.advanceReplayFrames moves it, so
// Playwright round trips (clicks, evaluates) cannot let extra frames slip in
// on a slow machine.
export async function startMatch(page, { mode = "local", map = null, seed = null, manualClock = false, aim = true } = {}) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady, null, { polling: 10 });
  const phase = await page.evaluate((options) => window.siege.debug.startMatch(options), { mode, map, seed, manualClock, aim });
  if (aim && phase !== "aim") throw new Error(`match did not reach aim (phase ${phase})`);
  return phase;
}

// Waits for one rendered frame: worm sprites and poses are chosen by the render
// loop, so presentation checks read state after a frame has drawn.
export async function renderedFrame(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
}
