import { test, expect } from "@playwright/test";

// The CPU turn picks its ballistic shot with the original 004CE3A0/004F39A0
// search and 004F2FD0 skill jitter, then fires it through the live controls.
test("computer turns choose ballistic shots with the original search", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="ai"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await page.evaluate(async () => {
    await window.siege.debug.resetSeed(42);
    window.siege.debug.setCrateKind("grenade");
    window.siege.debug.collectCrate();
  });
  await page.locator("#skip").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().team), { timeout: 18000 })
    .toBe(1);
  const turns = await page.evaluate(() => {
    const plans = [];
    let last = null;
    for (let frames = 0; frames < 6000 && plans.length < 3; frames += 5) {
      window.siege.debug.advanceReplayFrames(5);
      const state = window.siege.getState();
      if (state.team === 1 && state.aiPlan && state.aiPlan !== last &&
          JSON.stringify(state.aiPlan) !== JSON.stringify(last)) {
        last = state.aiPlan;
        plans.push({ ...state.aiPlan, round: state.round });
      }
      if (state.team === 0 && state.phase === "aim" && plans.length)
        document.querySelector("#skip")?.click();
    }
    return plans;
  });
  expect(turns.length).toBeGreaterThan(0);
  const native = turns.filter((plan) => plan.native);
  expect(native.length).toBeGreaterThan(0);
  for (const plan of native) {
    expect(["rocket", "grenade", "cluster", "banana", "holy", "napalm"]).toContain(plan.weapon);
    // 004F2FD0 clamps power to 0x1999..0x10000 in 0x369 steps.
    expect(plan.power).toBeGreaterThanOrEqual(10);
    expect(plan.power).toBeLessThanOrEqual(100);
    expect(plan.nativePower % 0x369).toBe(0);
    expect(plan.nativePower).toBeGreaterThanOrEqual(0x1999);
    // Aim is quantized to 0x200 steps within 0..0x10000.
    expect(plan.nativeAim % 0x200).toBe(0);
    if (plan.weapon === "grenade") expect(plan.fuse).toBeGreaterThanOrEqual(1);
    expect(plan.score).toBeGreaterThan(0);
  }
});
