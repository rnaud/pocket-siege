import { expect } from "@playwright/test";
// Gameplay specs drive the live match through its 20 ms logic step instead
// of waiting in real time, so each test spends only the frames it needs.

// Steps logic frames until `predicate(state, arg)` (serialised and run in the
// page) holds. Resolves to the frames advanced; throws after `max` frames.
export async function advanceUntil(page, predicate, { max = 1500, step = 1, arg, label = "condition" } = {}) {
  const frames = await page.evaluate(
    ({ source, max, step, arg }) => {
      const test = (0, eval)(`(${source})`);
      for (let i = 0; i <= max; i += step) {
        if (test(window.siege.getState(), arg)) return i;
        window.siege.debug.advanceReplayFrames(step);
      }
      return -1;
    },
    { source: predicate.toString(), max, step, arg },
  );
  if (frames < 0) throw new Error(`${label} not reached within ${max} logic frames`);
  return frames;
}

// Steps a fixed number of logic frames, then waits for one rendered frame so
// render-derived presentation (poses, labels, DOM) catches up.
export async function advanceFrames(page, count) {
  await page.evaluate(async (count) => {
    window.siege.debug.advanceReplayFrames(count);
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }, count);
}

// Holds Space for `milliseconds` of simulated time (charge accrues per logic
// step), so shot power no longer depends on runner speed.
export async function chargeFor(page, milliseconds = 600) {
  await page.keyboard.down("Space");
  await page.evaluate((frames) => window.siege.debug.advanceReplayFrames(frames), Math.round(milliseconds / 20));
  await page.keyboard.up("Space");
}

// Runs the match faster than real time while still rendering every animation
// frame: after each rendered frame `perFrame` extra logic steps run, until
// `until(state)` holds. Render-only state sampled per frame stays observable
// as long as it lasts longer than `perFrame` steps. Resolves to the state.
export async function fastForward(page, until, { perFrame = 4, max = 3000, label = "condition" } = {}) {
  const result = await page.evaluate(
    ({ source, perFrame, max }) =>
      new Promise((resolve) => {
        const done = (0, eval)(`(${source})`);
        let steps = 0;
        const tick = () => {
          const state = window.siege.getState();
          if (done(state)) return resolve({ ok: true, state });
          if (steps >= max) return resolve({ ok: false });
          window.siege.debug.advanceReplayFrames(perFrame);
          steps += perFrame;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { source: until.toString(), perFrame, max },
  );
  if (!result.ok) throw new Error(`${label} not reached within ${max} extra logic frames`);
  return result.state;
}

// Shared gameplay-spec setup (game*.spec.js).

// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
export async function fixTerrainRandom({ page }) {
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (array) => {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = 42;
        return array;
      }
      return original(array);
    };
  });
}

export async function openArsenal(page) {
  if (!(await page.locator(".weapon-panel").isVisible()))
    await page.locator("#inventory-toggle").click();
}

export async function chargeShot(page, milliseconds = 600) {
  await expect(page.locator("#fire")).toBeEnabled();
  // Charge for simulated, not wall-clock, time so shot power is reproducible.
  await chargeFor(page, milliseconds);
}

export async function setAim(page, value) {
  // Set up a reproducible shot; separate tests cover the real keyboard/touch controls.
  await page.locator("#angle").evaluate((el, value) => {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

// A local match on the Custom scheme, which keeps the host kit (Classic duel
// starts with the original default kit), with the arsenal open.
export async function startCustomMatch(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.selectOption("#scheme", "custom");
  await page.locator("#start").click();
  await openArsenal(page);
}
