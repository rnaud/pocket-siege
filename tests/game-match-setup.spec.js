import { test, expect } from "./helpers/shared-page.js";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
import { startMatch } from "./helpers/match.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
test("desktop fills the window without page scrolling", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "desktop layout");
  await page.setViewportSize({ width: 1440, height: 900 });
  await startMatch(page);
  await expect(page.locator("#fire")).toBeEnabled();
  const layout = await page.evaluate(() => {
    const app = document.querySelector("#app").getBoundingClientRect(),
      arena = document.querySelector("#arena").getBoundingClientRect();
    return {
      appWidth: Math.round(app.width),
      appLeft: Math.round(app.left),
      arenaHeight: Math.round(arena.height),
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    };
  });
  expect(layout.appWidth).toBe(layout.viewportWidth);
  expect(layout.appLeft).toBe(0);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.arenaHeight).toBeGreaterThan(layout.viewportHeight * 0.55);
  await expect(page.locator("#fire")).toBeInViewport({ ratio: 1 });
});

test("best-of-three, storm weather and a supply crate start together", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-mode="ai"]').click();
  await page.selectOption("#format", "best3");
  await page.selectOption("#weather", "storm");
  await page.locator("#start").click();
  await expect(page.locator("#series")).toBeVisible();
  await expect(page.locator("#series")).toContainText("0–0");
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.format).toBe("best3");
  expect(state.weather).toBe("storm");
  expect(state.seriesWins).toEqual([0, 0]);
  expect([
    "health",
    "grenade",
    "mortar",
    "sticky",
    "utility",
    "special",
  ]).toContain(state.crate?.kind);
  expect(
    await page.evaluate(
      () => document.querySelector("#weather-layer").className,
    ),
  ).toBe("storm");
  // Weather is visual; native default wind selects levels -10..10 in
  // signed 16.16, then the physics adapter converts to engine units.
  const nativeWindLevels = Array.from({ length: 21 }, (_, index) =>
    Math.trunc(((index - 10) * 65536) / 35) / 65536 * 2500,
  );
  expect(nativeWindLevels).toContain(state.wind);
});

test("daily island starts a seeded clear-weather solo match", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#daily").click();
  await expect(page.locator("#menu")).not.toBeVisible();
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.daily).not.toBeNull();
  expect(state.mapLayout).toMatch(/^original:(image|mission)\//);
  expect(state.daily.seed).toBeGreaterThanOrEqual(100);
  expect(state.daily.seed).toBeLessThan(1000);
  expect(state.format).toBe("single");
  expect(state.weather).toBe("clear");
  expect(state.mode).toBe("ai");
  expect(await page.evaluate(() => document.querySelector("#mode").value)).toBe(
    "ai",
  );
  expect(
    await page.evaluate(
      () => document.querySelector(".location span").textContent,
    ),
  ).toBe("DAILY ISLAND");
  expect(
    await page.evaluate(
      () => document.querySelector("#weather-layer").className,
    ),
  ).toBe("");
});

test("a persisted record book appears in the menu", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "pocket-siege-record-v1",
      JSON.stringify({
        played: 4,
        wins: 3,
        losses: 1,
        streak: 2,
        bestStreak: 3,
        bestHit: 87,
        longest: 912,
        daily: { date: "", won: null },
      }),
    );
  });
  await page.reload();
  // The record book is filled once the original assets finish loading.
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await expect(page.locator("#record-summary")).toContainText("3W–1L");
  await expect(page.locator("#record-summary")).toContainText("BEST HIT 87");
  await expect(page.locator("#record-summary")).toContainText("LONGEST 912");
});

test("best-of-three advances islands and records the series", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-mode="ai"]').click();
  await page.selectOption("#format", "best3");
  await page.locator("#start").click();
  await expect(page.locator("#series")).toContainText("0–0");
  await page.evaluate(() => window.siege.debug.knockout(1));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("break");
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.seriesWins).toEqual([1, 0]);
  expect(state.breakTimer).toBeGreaterThan(0);
  await expect(page.locator("#series")).toContainText("1–0");
  await page.evaluate(() => window.siege.debug.skipBreak());
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("aim");
  state = await page.evaluate(() => window.siege.getState());
  expect(state.seriesWins).toEqual([1, 0]);
  expect(state.seriesRound).toBe(2);
  expect(state.team).toBe(1);
  await page.evaluate(() => window.siege.debug.knockout(1));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("over");
  state = await page.evaluate(() => window.siege.getState());
  expect(state.seriesWins).toEqual([2, 0]);
  expect(state.record).toMatchObject({ played: 1, wins: 1, losses: 0 });
  await page.locator("#restart").click();
  await expect(page.locator("#record-summary")).toContainText("1W–0L");
});

test("daily island records today's result in the local record book", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#daily").click();
  await expect(page.locator("#menu")).not.toBeVisible();
  await page.evaluate(() => window.siege.debug.knockout(1));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("over");
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.daily).not.toBeNull();
  expect(state.record.daily).toEqual({ date: state.daily.date, won: true });
  expect(state.record).toMatchObject({ played: 1, wins: 1, losses: 0 });
  await page.locator("#restart").click();
  await expect(page.locator("#daily-status")).toContainText("TODAY: WON");
});

test("supply crate and a killing blow feed the pickup and slow-motion systems", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-mode="local"]').click();
  // Custom keeps the host crate rules; Classic duel draws crates from the scheme bag.
  await page.selectOption("#scheme", "custom");
  await page.locator("#start").click();
  const before = await page.evaluate(() => window.siege.getState());
  expect(before.crate).not.toBeNull();
  await page.evaluate(() => window.siege.debug.collectCrate());
  const after = await page.evaluate(() => window.siege.getState());
  expect(after.crate).toBeNull();
  if (before.crate.kind === "health")
    expect(after.worms[0].hp).toBeGreaterThanOrEqual(before.worms[0].hp);
  else if (before.crate.kind === "utility" || before.crate.kind === "special")
    expect(after.crate).toBeNull();
  else
    expect(after.ammo[0][before.crate.kind]).toBe(
      before.ammo[0][before.crate.kind] + 1,
    );
  await page.evaluate(() => window.siege.debug.hit(1, 200));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().slowMo))
    .toBeGreaterThan(0);
  await expect(page.locator("#arena")).toHaveClass(/slow-mo/);
});

test("match modifiers change gravity, blast size and turn length", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="ai"]').click();
  await page.selectOption("#modifier", "moon-chaos");
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.modifier).toBe("moon-chaos");
  expect(state.gravityScale).toBe(0.55);
  expect(state.blastScale).toBe(1.35);
  expect(state.turnSeconds).toBe(30);
});
