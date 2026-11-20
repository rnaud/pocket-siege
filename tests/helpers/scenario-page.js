import { test } from "@playwright/test";

// Shared setup for scenario and live-gameplay specs. Waits use
// page.waitForFunction (checked every animation frame) rather than
// expect.poll, whose back-off can add up to a second per wait, and long
// simulations step the 20 ms logic tick instead of waiting in real time.

export async function bootGame(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
}

// Opens a mission or training from the front end and waits until the
// scenario match is aiming (the default match behind the menu already aims).
// Some scenarios open with a settle phase or a CPU turn; those frames are
// stepped in logic time rather than waited for. With `aim: false` it only
// waits for the scenario's match clock to start.
export async function openScenario(page, path, { boot = true, aim = true } = {}) {
  if (boot) await bootGame(page);
  await page.locator(`[data-mode="${path.includes("training") ? "training" : "missions"}"]`).click();
  await page.locator(`[data-scenario="${path}"]`).click();
  await page.locator(".frontend-play-scenario").click();
  // Match time only advances once the scenario map has loaded.
  await page.waitForFunction(() => {
    const state = window.siege.getState();
    return Boolean(state.scenario) && state.matchElapsed > 0;
  }, null, { timeout: 30000 });
  if (!aim) return;
  const aiming = await page.evaluate(() => {
    for (let frame = 0; frame < 1500; frame += 5) {
      if (window.siege.getState().phase === "aim") return true;
      window.siege.debug.advanceReplayFrames(5);
    }
    return false;
  });
  if (!aiming)
    await page.waitForFunction(() => window.siege.getState().phase === "aim", null, { timeout: 30000 });
}

// Starts a local match from the front end and waits for the first aim.
export async function startLocalMatch(page, map = null) {
  await bootGame(page);
  await page.locator('[data-mode="local"]').click();
  if (map) await page.locator("#map-layout").selectOption(map);
  await page.locator("#start").click();
  await page.waitForFunction(() => !document.querySelector("#menu").open && window.siege.getState().phase === "aim",
    null, { timeout: 30000 });
}

// Steps logic frames until `predicate(state, arg)` holds (evaluated in the
// page). Resolves to the frames advanced; throws after `max` frames.
export async function advanceUntil(page, predicate, { max = 3000, step = 1, arg, label = "condition" } = {}) {
  const frames = await page.evaluate(({ source, max, step, arg }) => {
    const done = (0, eval)(`(${source})`);
    for (let i = 0; i <= max; i += step) {
      if (done(window.siege.getState(), arg)) return i;
      window.siege.debug.advanceReplayFrames(step);
    }
    return -1;
  }, { source: predicate.toString(), max, step, arg });
  if (frames < 0) throw new Error(`${label} not reached within ${max} logic frames`);
  return frames;
}

// Steps the logic frames left until the scenario round time is spent. Frames
// that do not count towards match time (hit stops) are made up in a few rounds.
export async function runOutRoundTime(page) {
  const elapsed = await page.evaluate(() => {
    for (let round = 0; round < 10; round++) {
      const state = window.siege.getState();
      if (state.matchElapsed >= state.roundTimeSeconds) return true;
      const frames = Math.ceil((state.roundTimeSeconds - state.matchElapsed) / (state.logicStepMs / 1000)) + 1;
      window.siege.debug.advanceReplayFrames(frames);
    }
    return false;
  });
  if (!elapsed) throw new Error("scenario round time not reached");
}

// Runs the match faster than real time while still rendering: on every
// animation frame `sample(state)` is recorded, then `perFrame` extra logic
// ticks run, until `until(state)` holds. Render-derived state (camera, DOM)
// stays observable. Resolves to { ticks, samples, state }.
export function fastForward(page, until, { perFrame = 4, maxTicks = 3000, sample = null, label = "condition" } = {}) {
  return page.evaluate(({ until, sample, perFrame, maxTicks, label }) => new Promise((resolve, reject) => {
    const done = (0, eval)(`(${until})`);
    const probe = sample ? (0, eval)(`(${sample})`) : null;
    const samples = [];
    let ticks = 0;
    const tick = () => {
      const state = window.siege.getState();
      if (probe) samples.push(probe(state));
      if (done(state)) return resolve({ ticks, samples, state });
      if (ticks >= maxTicks) return reject(new Error(`${label} not reached after ${ticks} extra ticks`));
      window.siege.debug.advanceReplayFrames(perFrame);
      ticks += perFrame;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { until: until.toString(), sample: sample?.toString() ?? null, perFrame, maxTicks, label });
}

// Native-layout specs: starting a match captures the mouse (pointer lock);
// most cases drive hover motion with synthetic pointer events, so they
// release it first. An Esc within 400 ms of releasing the mouse is swallowed,
// so only a match that actually held the lock waits before continuing.
export async function startNativeLayoutMatch(page, map = null, { keepPointerLock = false } = {}) {
  await startLocalMatch(page, map);
  if (!keepPointerLock) {
    const locked = await page.evaluate(() => {
      const held = Boolean(document.pointerLockElement);
      document.exitPointerLock();
      return held;
    });
    if (locked) await page.waitForTimeout(450);
  }
}

const CONTEXT_OPTIONS = ["baseURL", "storageState", "viewport", "userAgent", "deviceScaleFactor",
  "isMobile", "hasTouch", "locale", "colorScheme", "screen"];

// Read-only checks of one scenario's starting state share a single opened
// match: the group runs in order in one worker and boots the scenario once.
// Each test receives the shared page through `page()`. Only add tests that do
// not change the match; a failing test restarts the worker, which reopens it.
export function sharedScenario(path, define) {
  test.describe(() => {
    test.describe.configure({ mode: "default" });
    let page = null;
    test.beforeAll(async ({ browser }, testInfo) => {
      const use = testInfo.project.use;
      const options = Object.fromEntries(CONTEXT_OPTIONS.filter((key) => use[key] !== undefined)
        .map((key) => [key, use[key]]));
      page = await (await browser.newContext(options)).newPage();
      await openScenario(page, path);
    });
    test.afterAll(async () => { await page?.context().close(); });
    define(() => page);
  });
}
