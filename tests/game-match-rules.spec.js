import { test, expect } from "./helpers/shared-page.js";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
import { startMatch } from "./helpers/match.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
test("a finished match enables the result card", async ({ page }, info) => {
  await page.goto("/");
  await page.locator('[data-mode="ai"]').click();
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.knockout(1));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("over");
  await page.locator("#restart").click();
  await expect(page.locator("#share")).toBeEnabled();
  expect(
    await page.evaluate(() => window.siege.getState().lastResult.winner),
  ).toBe(0);
  {
    const pendingDownload = page.waitForEvent("download");
    await page.locator("#share").click();
    const download = await pendingDownload;
    expect(await download.failure()).toBeNull();
    await download.saveAs("test-results/desktop-result-card.png");
  }
});

test("saved settings survive a reload", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-mode="ai"]').click();
  await page.locator("#difficulty").selectOption("veteran");
  await page.locator('[data-mode="local"]').click();
  await page.selectOption("#format", "best3");
  await page.selectOption("#weather", "storm");
  await page.selectOption("#modifier", "low-gravity");
  await page.selectOption("#scheme", "custom");
  await page.selectOption("#turn-time", "60");
  await page.selectOption("#retreat-time", "8");
  await page.selectOption("#sudden-death", "nuke");
  await page.locator("#start").click();
  await page.locator("#sound").click();
  await page.reload();
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  expect(await page.locator("#mode").inputValue()).toBe("local");
  await page.locator('[data-mode="local"]').click();
  expect(await page.locator("#difficulty").inputValue()).toBe("veteran");
  expect(await page.locator("#format").inputValue()).toBe("best3");
  expect(await page.locator("#weather").inputValue()).toBe("storm");
  expect(await page.locator("#modifier").inputValue()).toBe("low-gravity");
  expect(await page.locator("#turn-time").inputValue()).toBe("60");
  expect(await page.locator("#retreat-time").inputValue()).toBe("8");
  expect(await page.locator("#sudden-death").inputValue()).toBe("nuke");
  expect(await page.locator("#scheme").inputValue()).toBe("custom");
  await expect(page.locator("#sound")).toHaveAttribute("aria-pressed", "true");
});

test("worm selection, turn pace and skip change the turn economy", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.selectOption("#turn-time", "60");
  await page.selectOption("#retreat-time", "8");
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  // Turn-control checks exclude unrelated supply-drop settlement.
  await page.evaluate(async () => {
    await window.siege.debug.resetSeed(42);
    window.siege.debug.setCrateKind("grenade");
    window.siege.debug.collectCrate();
  });
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.turnSeconds).toBe(60);
  expect(state.retreatSeconds).toBe(8);
  await expect(page.locator("#timer")).toContainText("60");
  const first = state.current;
  await page.locator("#select-worm").click();
  state = await page.evaluate(() => window.siege.getState());
  expect(state.current).not.toBe(first);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#select-worm")).toBeHidden();
  await page.locator("#skip").click();
  await advanceUntil(page, (s) => s.team === 1, { max: 500, step: 5, label: "next team" });
});

test("Tab selects each worm in turn and centres the camera on it", async ({ page }) => {
  // Native layout narrower than the island, so the camera has room to scroll.
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  // Desktop players get the native layout and camera; the fixture's host
  // layout flag would bypass both.
  await page.evaluate(() => localStorage.removeItem("pocket-siege-host-layout"));
  await page.reload();
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  // Four local teams spread each team's worms across the island.
  await page.evaluate(async () => {
    const count = document.querySelector("#team-count");
    count.value = "4";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    await window.siege.debug.startMatch({ mode: "local", map: "fern", seed: 42, manualClock: true });
  });
  const step = (ticks) => page.evaluate(async (ticks) => {
    for (let tick = 0; tick < ticks; tick++) {
      window.siege.debug.advanceReplayFrames(1);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const s = window.siege.getState();
    return { current: s.current, focus: Boolean(s.nativeCameraFocus),
      centre: s.camera.x + s.camera.w / 2, target: s.worms[s.current].x };
  }, ticks);
  // The opening crate holds the native camera; Tab must still take it.
  const opening = await step(10);
  expect(opening.focus).toBe(true);
  const views = [];
  for (let press = 0; press < 3; press++) {
    await page.keyboard.press("Tab");
    views.push(await step(30));
  }
  expect(new Set(views.map((view) => view.current)).size, JSON.stringify(views)).toBe(3);
  for (const view of views) expect(Math.abs(view.centre - view.target), JSON.stringify(views)).toBeLessThan(24);
});

test("sudden-death health and nuclear variants apply", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.selectOption("#sudden-death", "health");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.triggerSuddenDeath());
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.suddenDeathType).toBe("health");
  expect(state.sdTriggered).toBe(true);
  expect(state.worms.every((w) => w.hp === 1)).toBe(true);
  await page.reload();
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.selectOption("#sudden-death", "nuke");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.triggerSuddenDeath());
  state = await page.evaluate(() => window.siege.getState());
  expect(state.poisoned).toBe(true);
});

test("surrender ends a live match from the menu", async ({ page }) => {
  await startMatch(page);
  await expect(page.locator("#surrender")).toBeHidden();
  await page.locator("#restart").click();
  await expect(page.locator("#surrender")).toBeVisible();
  await page.locator("#surrender").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("over");
  expect(
    await page.evaluate(() => window.siege.getState().lastResult.winner),
  ).toBe(1);
});
