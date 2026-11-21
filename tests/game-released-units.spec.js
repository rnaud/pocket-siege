import { test, expect } from "@playwright/test";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
import { startMatch } from "./helpers/match.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
test("released units walk along the ground", async ({ page }) => {
  await startMatch(page);
  for (const kind of ["sheep", "supersheep", "aquasheep", "donkey", "oldwoman",
    "sallyarmy", "skunk", "madcow", "molebomb"]) {
    await page.evaluate(kind => window.siege.debug.spawnUnitAt(kind, 600), kind);
    const before = await page.evaluate(() => window.siege.getState().projectile?.x ?? null);
    expect(before, kind).not.toBeNull();
    await page.evaluate(frames => window.siege.debug.advanceReplayFrames(frames),
      kind === "donkey" ? 20 : 80);
    const after = await page.evaluate(() => window.siege.getState().projectile?.x ?? null);
    expect(after, `${kind}:${before}->${after}`).not.toBeNull();
    expect(after, `${kind}:${before}->${after}`).not.toBe(before);
    expect(await page.evaluate(() => window.siege.getState().projectile?.walkTicks ?? 0), kind)
      .toBeGreaterThan(0);
  }
});

test("donkey units use the released-unit walking path", async ({ page }) => {
  await startMatch(page);
  await page.evaluate(() => window.siege.debug.spawnUnitAt("donkey", 600));
  const before = await page.evaluate(() => window.siege.getState().projectile?.x ?? null);
  expect(before).not.toBeNull();
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(20));
  const after = await page.evaluate(() => window.siege.getState().projectile?.x ?? null);
  expect(after).not.toBeNull();
  expect(after).not.toBe(before);
});

test("walking skunk leaves a poison trail", async ({ page }) => {
  await startMatch(page);
  await page.evaluate(() => window.siege.debug.setWormPosition(3, 600));
  await page.evaluate(() => window.siege.debug.spawnUnitAt("skunk", 600));
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(160));
  await advanceUntil(page, (s) => s.worms.some((worm) => worm.nativePoison.amount !== 0), { max: 500, label: "poisoned" });
});

test("sally army detonation emits sheep payloads", async ({ page }) => {
  await startMatch(page);
  await page.evaluate(() => window.siege.debug.detonateAt("sallyarmy", 600, 350));
  const kids = await page.evaluate(() =>
    window.siege.getState().bombs.filter((bomb) => bomb.kind === "sheep").length);
  expect(kids).toBe(4);
});

test("released units walk at different speeds", async ({ page }) => {
  await startMatch(page);
  const travel = async (kind) => {
    await page.evaluate(kind => window.siege.debug.spawnUnitAt(kind, 600), kind);
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(40));
    return page.evaluate(() => Math.abs(window.siege.getState().projectile?.x - 600));
  };
  const sheep = await travel("sheep");
  const oldWoman = await travel("oldwoman");
  expect(sheep).toBeGreaterThan(0);
  expect(oldWoman).toBeGreaterThan(0);
  expect(oldWoman).toBeLessThan(sheep);
});

test("super sheep steers horizontally while airborne", async ({ page }) => {
  await startMatch(page);
  const y = await page.evaluate(() => window.siege.getState().waterLevel + 100);
  await page.evaluate((y) => window.siege.debug.spawnUnitAt("supersheep", 600, y), y);
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(30));
  const x = await page.evaluate(() => window.siege.getState().projectile?.x ?? null);
  expect(x).not.toBeNull();
  expect(x).not.toBe(600);
});
