import { test, expect } from "@playwright/test";

async function startLocalMatch(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 30000 })
    .toBe("aim");
}

test("turns start through 004B3210 and retreat runs the native request and countdown", async ({ page }) => {
  await startLocalMatch(page);
  const first = await page.evaluate(() => window.siege.getState().turnBody);
  // 004B3210: scheme seconds become milliseconds and both targets are raised.
  expect(first.turnDuration).toBe(await page.evaluate(() => window.siege.getState().turnTime * 1000));
  expect(first.clockTarget).toBe(65536);
  expect(first.turnCount).toBeGreaterThan(0);
  // Throw a grenade at full power so it lands far away on its fuse; a hit
  // on the thrower would end the turn without a retreat.
  await page.keyboard.press("F2");
  await page.locator("#angle").evaluate((el) => {
    el.value = "45";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.keyboard.down("Space");
  await page.waitForTimeout(800);
  // 004B4CE0: the request clears the clock target; the countdown starts only
  // once the worm's action is over, then drops 20 ms per frame.
  // Release fire inside the same synchronous evaluate as the frame stepping,
  // so no real-time frame starts the countdown unobserved.
  const retreat = await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    const debug = window.siege.debug;
    let body = window.siege.getState().turnBody;
    for (let frame = 0; frame < 600 && !body.retreatRemaining; frame++) {
      debug.advanceReplayFrames(1);
      body = window.siege.getState().turnBody;
    }
    const started = body.retreatRemaining;
    debug.advanceReplayFrames(1);
    const next = window.siege.getState().turnBody.retreatRemaining;
    debug.advanceReplayFrames(1);
    return { started, next, after: window.siege.getState().turnBody.retreatRemaining,
      duration: body.retreatDuration, clockTarget: body.clockTarget, pending: body.retreatPending };
  });
  expect(retreat.started).toBe(retreat.duration);
  expect(retreat.pending).toBe(0);
  expect(retreat.clockTarget).toBe(0);
  expect(retreat.next).toBe(retreat.started - 20);
  expect(retreat.after).toBe(retreat.started - 40);
  // The next turn counts once more and raises the clock again.
  const next = await page.evaluate((count) => {
    for (let frames = 0; frames < 6000; frames += 25) {
      const state = window.siege.getState();
      if (state.phase === "aim" && state.turnBody.turnCount > count) return state.turnBody;
      window.siege.debug.advanceReplayFrames(25);
    }
    return window.siege.getState().turnBody;
  }, first.turnCount);
  expect(next.turnCount).toBe(first.turnCount + 1);
  expect(next.clockTarget).toBe(65536);
  expect(next.retreatRemaining).toBe(0);
});
