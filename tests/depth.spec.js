import { test, expect } from "@playwright/test";
import {
  Terrain,
  walkWorm,
  blastExposure,
  clearBodyPath,
} from "../src/physics.js";
import { planRetreat, scoreBlast } from "../src/ai.js";
import { fragments, airstrikePattern } from "../src/weapon-behavior.js";

const worm = (x, team = 0) => ({
  x,
  y: 310,
  team,
  hp: 100,
  vx: 0,
  vy: 0,
  ground: true,
  knocked: false,
});

test("walking sweeps walls and releases support at a ledge", () => {
  expect(
    clearBodyPath({ solid: (x, y) => x >= 140 && x < 142 }, 100, 310, 200, 310),
  ).toBe(false);
  expect(clearBodyPath({ solid: () => false }, 100, 310, 200, 310)).toBe(true);
  const w = worm(100);
  walkWorm(
    w,
    { solid: (x, y) => y < 300 || (x >= 140 && x < 143 && y < 450) },
    1,
    2,
  );
  expect(w.x).toBeLessThan(125);
  const edge = worm(100);
  walkWorm(edge, { solid: (x, y) => x < 120 && y < 300 }, 1, 2);
  expect(edge.ground).toBe(false);
  expect(edge.x).toBeLessThan(145);
});

test("AI retreats toward cover without walking off a cliff", () => {
  const terrain = { solid: (x, y) => x < 240 && y < 300 };
  const me = worm(210),
    enemy = worm(300, 1);
  const route = planRetreat({ terrain, me, worms: [me, enemy], danger: enemy });
  expect(route?.direction).toBe(-1);
  const alone = planRetreat({ terrain, me, danger: { x: 100, y: 310 } });
  expect((alone?.time ?? 0) * 42).toBeLessThan(40);
});

test("rock cover attenuates blasts and AI penalizes friendly damage", () => {
  const open = { solid: () => false },
    rock = { solid: (x) => x > 420 && x < 455 };
  expect(blastExposure(open, 400, 327, 480, 327)).toBe(1);
  expect(blastExposure(rock, 400, 327, 480, 327)).toBeLessThan(0.6);
  const me = worm(200),
    enemy = worm(480, 1),
    friend = worm(480, 0),
    point = { x: 460, y: 327 };
  expect(scoreBlast(point, "rocket", [me, enemy], me)).toBeGreaterThan(0);
  expect(scoreBlast(point, "rocket", [me, friend], me)).toBeLessThan(0);
});

test("maps preserve paired elevations and offer galleries and breakable bridges", () => {
  for (const layout of [
    "highlands",
    "archipelago",
    "forts",
    "caverns",
    "bridges",
  ]) {
    const t = new Terrain(73, layout);
    for (const [a, b] of [
      [180, 1020],
      [340, 860],
      [490, 710],
    ])
      expect(t.surface(a)).toBe(t.surface(b));
  }
  const caves = new Terrain(73, "caverns");
  expect(caves.solid(600, 185)).toBe(false);
  expect(caves.solid(600, 270)).toBe(true);
  const bridge = new Terrain(73, "bridges"),
    top = bridge.surface(600);
  expect(bridge.solid(600, top - 5)).toBe(true);
  expect(bridge.solid(600, top - 20)).toBe(false);
  bridge.carve(600, top - 6, 20);
  expect(bridge.solid(600, top - 5)).toBe(false);
});

test("fragment fans spread and opposite airstrike paths hit the same footprint", () => {
  for (const kind of ["mortar", "cluster"]) {
    const fan = fragments(kind);
    expect(fan.length).toBeGreaterThanOrEqual(3);
    expect(fan[0].vx).toBeGreaterThan(80);
    expect(fan.at(-1).vx).toBeLessThan(-80);
    expect(fan.every((f) => f.vy > 0)).toBe(true);
  }
  for (const direction of [-1, 1])
    for (const [i, b] of airstrikePattern(
      600,
      300,
      direction,
      650,
      145,
    ).entries()) {
      const t = (b.vy + Math.sqrt(b.vy * b.vy + 2 * 145 * (b.y - 300))) / 145;
      expect(b.x + b.vx * t).toBeCloseTo(600 + (i - 2) * 34);
      expect(Math.sign(b.vx)).toBe(direction);
    }
});

test("synthesized weapon voices produce finite audio and decay to silence", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { playSound, SOUND_PROFILES } = await import("/src/sound.js");
    const result = [];
    for (const kind of Object.keys(SOUND_PROFILES)) {
      const ctx = new OfflineAudioContext(1, 22050, 22050);
      playSound(ctx, kind);
      const buffer = await ctx.startRendering(),
        samples = buffer.getChannelData(0);
      result.push({
        kind,
        finite: samples.every(Number.isFinite),
        peak: Math.max(...samples.map(Math.abs)),
        tail: Math.max(...samples.slice(20000).map(Math.abs)),
      });
    }
    return result;
  });
  for (const voice of result) {
    expect(voice.finite).toBe(true);
    expect(voice.peak).toBeGreaterThan(0.005);
    expect(voice.peak).toBeLessThan(0.5);
    expect(voice.tail).toBe(0);
  }
});

for (const layout of ["caverns", "bridges"])
  test(`${layout} starts with playable worms and directional airstrike controls`, async ({
    page,
  }) => {
    await page.goto("/");
    await expect
      .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
      .toBe(true);
    await page.locator("#mode").selectOption("local");
    await page.locator("#map-layout").selectOption(layout);
    await page.locator("#start").click();
    expect(
      (await page.evaluate(() => window.siege.getState())).worms.every(
        (w) => w.hp === 100,
      ),
    ).toBe(true);
    await page.locator("#inventory-toggle").click();
    await page.locator("#special-toggle").click();
    await page.locator('[data-weapon="airstrike"]').click();
    await expect(page.locator("#strike-direction")).toBeVisible();
    await page.locator("#strike-direction").selectOption("-1");
    await page.screenshot({ path: test.info().outputPath(`${layout}.png`) });
    await page.locator("#fire").click();
    const box = await page.locator("#arena").boundingBox();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await expect
      .poll(() => page.evaluate(() => window.siege.getState().bombs.length))
      .toBe(5);
  });
