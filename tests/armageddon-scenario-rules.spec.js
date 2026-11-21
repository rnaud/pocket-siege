import { test, expect } from "./helpers/shared-page.js";
// Split from armageddon-scenario-match: the import keeps these browser checks
// selected (CI and pre-commit follow Node imports) when the resolver changes.
import "../src/armageddon/scenario-match.js";
import { openScenario, sharedScenario, advanceUntil } from "./helpers/scenario-page.js";

test("scenario fixed wind feeds the native wind selection", async ({ page }) => {
  await openScenario(page, "mission/training3.wam");
  expect(Math.abs(await page.evaluate(() => window.siege.getState().wind) + 250)).toBeLessThan(0.1);
});

test("scenario friction feeds the live native body setup", async ({ page }) => {
  await openScenario(page, "mission/mission15.wam");
  expect(await page.evaluate(() => window.siege.getState().friction)).toBe(40);
});

test("scenario fall damage option scales live fall damage", async ({ page }) => {
  await openScenario(page, "mission/training13.wam");
  expect(await page.evaluate(() => window.siege.getState().fallDamageScale)).toBeCloseTo(0.03);
});

test("scenario health-only crate drops produce health crates", async ({ page }) => {
  await openScenario(page, "mission/mission26.wam");
  await advanceUntil(page, (state) => state.crates.some((crate) => !crate.scenario),
    { step: 10, max: 3000, label: "supply crate" });
  expect(await page.evaluate(() => {
    const crates = window.siege.getState().crates.filter((crate) => !crate.scenario);
    return `${crates[0].kind}:${crates[0].quantity}`;
  })).toBe("health:20");
});

test("scenario weapons-dont-end-turn keeps the same worm active", async ({ page }) => {
  await openScenario(page, "mission/mission24.wam");
  const before = await page.evaluate(() => window.siege.getState().current);
  // Charge for 700 ms of simulated time, then let the shot resolve in frames.
  await page.keyboard.down("Space");
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(35));
  await page.keyboard.up("Space");
  await advanceUntil(page, (state) => state.phase !== "aim", { max: 200, label: "shot" });
  // The first aim after the shot resolves shows who acts next.
  await advanceUntil(page, (state) => state.phase === "aim", { step: 10, label: "aim" });
  expect(await page.evaluate(() => window.siege.getState().current)).toBe(before);
});

test("scenario replay option disables the replay control", async ({ page }) => {
  await openScenario(page, "mission/mission12.wam");
  expect(await page.evaluate(() => window.siege.getState().replayEnabled)).toBe(false);
});

test("scenario jetpack time limit sets the live fuel tank", async ({ page }) => {
  await openScenario(page, "mission/mission17.wam");
  expect(await page.evaluate(() => window.siege.getState().jetpackFuel)).toBe(10);
});

sharedScenario("mission/mission10.wam", (shared) => {
  test("scenario sudden-death options disable the host round-six trigger", async () => {
    const page = shared();
    expect(await page.evaluate(() => window.siege.getState().suddenDeathDisabled)).toBe(true);
  });
  test("indestructible scenario landscape blocks terrain carving", async () => {
    const page = shared();
    const before = await page.evaluate(() => window.siege.getState().terrainPixels);
    await page.evaluate(() => window.siege.debug.explodeAt(600, 350, "cluster"));
    const after = await page.evaluate(() => window.siege.getState().terrainPixels);
    expect(after).toBe(before);
  });
});

sharedScenario("mission/mission1.wam", (shared) => {
  test("scenario sudden death types 2 and 3 reach health and nuclear modes (type 2: mission1 health)", async () => {
    expect(await shared().evaluate(() => window.siege.getState().suddenDeathType)).toBe("health");
  });
  test("scenario mine fuse feeds the live mine timer", async () => {
    const page = shared();
    expect(await page.evaluate(() => window.siege.getState().mineFuse)).toBe(4);
  });
});

sharedScenario("mission/mission18.wam", (shared) => {
  test("scenario sudden death types 2 and 3 reach health and nuclear modes (type 3: mission18 nuke)", async () => {
    expect(await shared().evaluate(() => window.siege.getState().suddenDeathType)).toBe("nuke");
  });
  test("mixed-case mission ammo keys still reach the live loadout", async () => {
    const page = shared();
    expect(await page.evaluate(() => window.siege.getState().ammo[0].uzi)).toBe(-1);
  });
});
