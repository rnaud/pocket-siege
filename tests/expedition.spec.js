import { test, expect } from "@playwright/test";
import {
  EXPEDITION_LENGTH, MUTATORS, REWARDS, newRun, routeOptions, chooseIsland, stageConfig,
  resolveBattle, takeReward, expeditionScore, expeditionDailySeed, loadRun, saveRun,
} from "../src/expedition.js";
import { MAP_LAYOUTS } from "../src/map-generator.js";
import { freshAmmo } from "../src/weapons.js";
import { freshUtilities } from "../src/utilities.js";
import { windowFrustum } from "../src/diorama.js";
import { GRAPHICS_OPTIONS, SHOWCASE_GRAPHICS, defaultGraphics, sanitizeGraphics, readGraphics, writeGraphics, resolveAtmosphere, toggleAllGraphics } from "../src/fx.js";
import { startMatch } from "./helpers/match.js";

const memory = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
};
const winAll = (run, survivors = [80, 80, 80]) => resolveBattle(run, { won: true, survivors });

test("the same seed charts the same route and supplies", { tag: "@logic" }, () => {
  const play = () => {
    let run = newRun(1234);
    const trail = [];
    while (run.status !== "won") {
      if (run.status === "route") { trail.push(routeOptions(run).map((node) => node.name)); run = chooseIsland(run, 1); }
      else if (run.status === "battle") run = winAll(run);
      else if (run.status === "draft") { trail.push([...run.offers]); run = takeReward(run, 0); }
    }
    return trail;
  };
  expect(play()).toEqual(play());
  expect(routeOptions(newRun(1))).not.toEqual(routeOptions(newRun(2)));
  expect(expeditionDailySeed(new Date(2026, 0, 5))).toEqual(expeditionDailySeed(new Date(2026, 0, 5)));
  expect(expeditionDailySeed(new Date(2026, 0, 5)).seed).not.toBe(expeditionDailySeed(new Date(2026, 0, 6)).seed);
});

test("every island and supply maps onto real match options", { tag: "@logic" }, () => {
  const ammo = freshAmmo(), utilities = freshUtilities();
  for (const reward of Object.values(REWARDS)) {
    for (const kind of Object.keys(reward.weapons ?? {})) expect(ammo, kind).toHaveProperty(kind);
    for (const kind of Object.keys(reward.utilities ?? {})) expect(utilities, kind).toHaveProperty(kind);
  }
  for (const effect of Object.values(MUTATORS))
    for (const kind of Object.keys(effect.enemyAmmo ?? {})) expect(ammo).toHaveProperty(kind);
  for (let seed = 1; seed <= 40; seed++) {
    let run = newRun(seed);
    for (let stage = 0; stage < EXPEDITION_LENGTH; stage++) {
      for (const node of routeOptions(run)) {
        expect(MAP_LAYOUTS).toContain(node.layout);
        expect(new Set(node.mutators).size).toBe(node.mutators.length);
      }
      run = chooseIsland(run, seed % 2);
      const config = stageConfig(run);
      expect(["rookie", "regular", "veteran"]).toContain(config.difficulty);
      expect([30, 45]).toContain(config.turnTime);
      expect(config.enemyHp).toBeGreaterThanOrEqual(70);
      run = winAll(run);
      while (run.status === "draft") run = takeReward(run, 0);
    }
    expect(run.status).toBe("won");
  }
});

test("wounds, stripes and losses carry between islands", { tag: "@logic" }, () => {
  let run = chooseIsland(newRun(7), 0);
  run = resolveBattle(run, { won: true, survivors: [100, 30, 0] });
  expect(run.status).toBe("draft");
  expect(run.index).toBe(1);
  // Survivors earn a stripe (+10 maximum) and 15 camp healing; the fallen stay down.
  expect(run.squad.map((worm) => [worm.hp, worm.maxHp, worm.stripes, worm.alive])).toEqual([
    [110, 110, 1, true], [45, 110, 1, true], [0, 100, 0, false],
  ]);
  expect(run.picks).toBe(1);
  expect(run.offers).toHaveLength(3);
  // A fallen worm sits out the next island entirely.
  const next = chooseIsland({ ...run, status: "route", offers: [], picks: 0 }, 0);
  expect(stageConfig(next).squad[2].alive).toBe(false);
  const lost = resolveBattle(next, { won: false, survivors: [0, 0, 0] });
  expect(lost.status).toBe("lost");
  expect(lost.squad.every((worm) => !worm.alive)).toBe(true);
  // A battle "won" with nobody left standing is still a lost expedition.
  expect(resolveBattle(next, { won: true, survivors: [0, 0, 0] }).status).toBe("lost");
});

test("supplies accumulate, risky routes pay an extra pick, and runs persist", { tag: "@logic" }, () => {
  let run = winAll(chooseIsland(newRun(99), 1));
  expect(run.picks).toBe(2);
  const first = run.offers[0];
  run = takeReward(run, 0);
  expect(run.status).toBe("draft");
  expect(run.rewards).toEqual([first]);
  run = takeReward(run, 0);
  expect(run.status).toBe("route");
  expect(run.rewards).toHaveLength(2);
  const config = stageConfig(chooseIsland(run, 0));
  for (const id of run.rewards) {
    for (const [kind, count] of Object.entries(REWARDS[id].weapons ?? {})) expect(config.weapons[kind]).toBeGreaterThanOrEqual(count);
    for (const [kind, count] of Object.entries(REWARDS[id].utilities ?? {})) expect(config.utilities[kind]).toBeGreaterThanOrEqual(count);
  }
  expect(expeditionScore(run)).toBeGreaterThan(100);
  const storage = memory();
  saveRun(run, storage);
  expect(loadRun(storage)).toEqual(run);
  saveRun(null, storage);
  expect(loadRun(storage)).toBeNull();
  storage.setItem("pocket-siege-expedition-v1", "{not json");
  expect(loadRun(storage)).toBeNull();
});

test("the diorama frustum keeps the gameplay plane fixed on screen", { tag: "@logic" }, () => {
  const view = { x: 100, y: 50, w: 800, h: 450 };
  for (const eye of [{ x: 500, y: 275, z: 650 }, { x: 320, y: 480, z: 650 }, { x: 900, y: 100, z: 300 }]) {
    const f = windowFrustum(view, eye);
    // Project the view corners (z = 0) through the frustum: they must land on ±1.
    const ndc = (x, y) => [
      (2 * (x - eye.x) * f.near / eye.z - (f.right + f.left)) / (f.right - f.left),
      (2 * (y - eye.y) * f.near / eye.z - (f.top + f.bottom)) / (f.top - f.bottom),
    ];
    const [left, bottom] = ndc(view.x, view.y), [right, top] = ndc(view.x + view.w, view.y + view.h);
    for (const [value, expected] of [[left, -1], [bottom, -1], [right, 1], [top, 1]]) expect(value).toBeCloseTo(expected, 9);
    expect(f.near).toBeGreaterThan(0);
    expect(f.far).toBeGreaterThan(eye.z + 180);
  }
});

test("an expedition island carries the squad in and the result back out", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#expedition-open").click();
  await page.getByRole("button", { name: "NEW EXPEDITION" }).click();
  await expect(page.locator("#expedition .expedition-card")).toHaveCount(2);
  await page.locator("#expedition .expedition-card .expedition-go").first().click();
  await expect(page.locator("#expedition")).not.toBeVisible({ timeout: 20000 });
  await expect(page.locator("#menu")).not.toBeVisible();
  const landed = await page.evaluate(() => window.siege.getState());
  expect(landed.expedition.status).toBe("battle");
  expect(landed.mapLayout).toBe(landed.expedition.current.layout);
  expect(landed.worms.filter((worm) => worm.team === 1).map((worm) => worm.hp)).toEqual([70, 70, 70]);
  await page.evaluate(() => { window.siege.debug.setWormHp(1, 40); window.siege.debug.knockout(1); });
  await expect(page.locator("#expedition")).toBeVisible({ timeout: 30000 });
  const after = await page.evaluate(() => window.siege.getState().expedition);
  expect(after.status).toBe("draft");
  expect(after.index).toBe(1);
  expect(after.squad[1].hp).toBeLessThan(after.squad[1].maxHp);
  await page.locator("#expedition .reward .expedition-go").first().click();
  await expect(page.locator("#expedition .expedition-chip")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("graphics options default to the original look and survive bad data", { tag: "@logic" }, () => {
  expect(defaultGraphics()).toEqual({ view: "flat", lighting: "off", destruction: "off", style: "none", atmosphere: "off" });
  for (const [key, option] of Object.entries(GRAPHICS_OPTIONS)) expect(option.values).toHaveProperty(defaultGraphics()[key]);
  expect(sanitizeGraphics({ view: "diorama", lighting: "sideways", style: 7 })).toEqual({ ...defaultGraphics(), view: "diorama" });
  const storage = memory();
  expect(readGraphics(storage)).toEqual(defaultGraphics());
  writeGraphics({ ...defaultGraphics(), style: "crt", lighting: "night" }, storage);
  expect(readGraphics(storage)).toEqual({ ...defaultGraphics(), style: "crt", lighting: "night" });
  storage.setItem("pocket-siege-graphics-v1", "{broken");
  expect(readGraphics(storage)).toEqual(defaultGraphics());
  // The master switch: showcase first, then whatever mix was last in use.
  const toggles = memory();
  expect(toggleAllGraphics(defaultGraphics(), toggles)).toEqual({ ...SHOWCASE_GRAPHICS });
  const custom = { ...defaultGraphics(), style: "blueprint", atmosphere: "snow" };
  expect(toggleAllGraphics(custom, toggles)).toEqual(defaultGraphics());
  expect(toggleAllGraphics(defaultGraphics(), toggles)).toEqual(custom);
  expect(resolveAtmosphere("off", "storm")).toMatchObject({ on: false, precipitation: "none" });
  expect(resolveAtmosphere("auto", "clear", "forest")).toMatchObject({ on: true, precipitation: "none", storm: false });
  expect(resolveAtmosphere("auto", "clear", "snow")).toMatchObject({ precipitation: "snow" });
  expect(resolveAtmosphere("auto", "storm", "forest")).toMatchObject({ precipitation: "rain", storm: true });
  expect(resolveAtmosphere("snow", "rain", "forest")).toMatchObject({ precipitation: "snow", storm: false });
});

async function startGraphicsMatch(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (/shader|program info|GL_INVALID|THREE\.WebGL/i.test(message.text())) errors.push(message.text()); });
  await startMatch(page, { map: "fern" });
  await expect(page.locator("#menu")).not.toBeVisible();
  return errors;
}
// Render a few frames with the current options (real frames run the renderer).
const renderFrames = (page) => page.evaluate(() => new Promise((done) => {
  let left = 3;
  const tick = () => (--left ? requestAnimationFrame(tick) : done());
  requestAnimationFrame(tick);
}));

// One test per option value so the renders run in parallel.
for (const [key, option] of Object.entries(GRAPHICS_OPTIONS)) {
  for (const value of Object.keys(option.values)) {
    test(`graphics ${key}=${value} renders a live match without errors`, async ({ page }) => {
      const errors = await startGraphicsMatch(page);
      expect(await page.evaluate(() => window.siege.getState().graphics)).toEqual(defaultGraphics());
      // Shift+F9 opens the sheet; plain F-keys stay the original weapon rows.
      await page.keyboard.press("Shift+F9");
      await expect(page.locator("#graphics")).toBeVisible();
      await page.locator(`#gfx-${key}`).selectOption(value);
      await renderFrames(page);
      if (key === "destruction" && value === "on") {
        await page.evaluate(() => window.siege.debug.explodeAt(600, 350, "rocket"));
        expect(await page.evaluate(() => window.siege.getState().graphicsCounts.shocks)).toBeGreaterThan(0);
      }
      expect((await page.evaluate(() => window.siege.getState().graphics))[key]).toBe(value);
      expect(errors).toEqual([]);
    });
  }
}

test("combined graphics options persist and the master switch restores them", async ({ page }) => {
  const errors = await startGraphicsMatch(page);
  await page.keyboard.press("Shift+F9");
  await expect(page.locator("#graphics")).toBeVisible();
  // Leave each group on a non-default value so the options also run combined.
  for (const [key, option] of Object.entries(GRAPHICS_OPTIONS))
    await page.locator(`#gfx-${key}`).selectOption(Object.keys(option.values)[1]);
  await renderFrames(page);
  const combined = await page.evaluate(() => window.siege.getState());
  expect(combined.diorama).toBe(true);
  expect(combined.graphics).toEqual({ view: "diorama", lighting: "day", destruction: "on", style: "crt", atmosphere: "auto" });
  await page.reload();
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  expect(await page.evaluate(() => window.siege.getState().graphics.style)).toBe("crt");
  // One switch turns everything off, and back on as it was.
  await page.locator("#graphics-open").click();
  await expect(page.locator("#gfx-master")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#gfx-master").click();
  expect(await page.evaluate(() => window.siege.getState().graphics)).toEqual(defaultGraphics());
  await page.locator("#gfx-master").click();
  expect(await page.evaluate(() => window.siege.getState().graphics.style)).toBe("crt");
  await page.locator("#gfx-master").click();
  expect(await page.evaluate(() => window.siege.getState().graphics)).toEqual(defaultGraphics());
  expect(errors).toEqual([]);
});
