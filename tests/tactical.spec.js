import { test, expect } from "./helpers/shared-page.js";
import { Terrain, stepWorm, bodyBlocked } from "../src/physics.js";
import { advanceUntil } from "./helpers/game-sim.js";
import { startMatch } from "./helpers/match.js";

test("seeded maps provide six stable, clear starting positions", { tag: "@logic" }, () => {
  for (const layout of [
    "highlands",
    "archipelago",
    "forts",
    "caverns",
    "bridges",
  ]) {
    for (let seed = 0; seed < 20; seed++) {
      const terrain = new Terrain(seed, layout);
      for (const x of [180, 340, 490, 710, 860, 1020]) {
        const w = {
          x,
          y: terrain.surface(x) + 12,
          vx: 0,
          vy: 0,
          ground: false,
          knocked: false,
        };
        for (let i = 0; i < 240; i++) stepWorm(w, terrain, 1 / 120);
        expect(w.y).toBeGreaterThan(110);
        expect(w.ground).toBe(true);
        expect(bodyBlocked(terrain, w.x, w.y)).toBe(false);
      }
    }
    const a = new Terrain(42, layout),
      b = new Terrain(42, layout),
      c = new Terrain(43, layout);
    expect(a.data).toEqual(b.data);
    expect(a.data.some((v, i) => v !== c.data[i])).toBe(true);
  }
});

test("homing selects a fixed world target through the current camera", async ({
  page,
}) => {
  await startMatch(page, { map: "highlands" });
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().mapLayout))
    .toBe("highlands");
  await page.locator("#inventory-toggle").click();

  await page.locator('[data-weapon="homing"]').click();
  await page.locator("#fire").click();
  expect(await page.evaluate(() => window.siege.getState().targetUtility)).toBe(
    "homing",
  );
  const arena = page.locator("#arena");
  const box = await arena.boundingBox();
  // Native object tracking can move the camera between browser round-trips.
  // Capture the view used by the actual pointer event, before its handler runs.
  await arena.evaluate(el => el.addEventListener("pointerdown", () => {
    window.targetClickCamera = window.siege.getState().camera;
  }, { capture: true, once: true }));
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.4);
  const { state, camera } = await page.evaluate(() => ({
    state: window.siege.getState(), camera: window.targetClickCamera,
  }));
  expect(state.homingTarget.x).toBeCloseTo(camera.x + camera.w * 0.6, -1);
  expect(state.homingTarget.y).toBeCloseTo(camera.y + camera.h * 0.6, -1);
  const marker = page.locator('canvas[aria-label="Homing target"]');
  await expect(marker).toBeVisible();
  await expect(marker).toHaveAttribute("data-original-sprite", "markerg");
  const markerBox = await marker.boundingBox();
  expect(markerBox.width).toBe(60);
  expect(markerBox.height).toBe(60);
  await page.screenshot({
    path: test.info().outputPath("original-target.png"),
  });
  // Charge for 500 ms of simulated time rather than wall-clock time.
  await page.locator("#fire").dispatchEvent("pointerdown", { pointerId: 1 });
  await page.evaluate(() => window.siege.debug.advanceReplayFrames(25));
  await page.locator("#fire").dispatchEvent("pointerup", { pointerId: 1 });
  expect(await page.evaluate(() => window.siege.getState().shotCount)).toBe(1);
  const fired = await page.evaluate(() => window.siege.getState());
  if (fired.projectile)
    expect(fired.projectile.target).toEqual(state.homingTarget);
  await page.screenshot({ path: test.info().outputPath("highlands.png") });
});

for (const kind of ["cluster", "napalm", "holy"]) {
  test(`${kind} launches and detonates ${kind === "holy" ? "after its native fuse and resting delay" : kind === "napalm" ? "on native impact" : "at its selected fuse"}`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.siege?.getState().assetsReady);
    await page.locator('[data-mode="local"]').click();
    // Custom keeps the host kit; Classic duel starts with the original default kit.
    await page.selectOption("#scheme", "custom");
    await page.locator("#start").click();
    // Keep the landing surface fixed: holy's native delay waits for rest.
    await page.evaluate(() => window.siege.debug.resetSeed(42));
    await page.locator("#inventory-toggle").click();

    await page.locator(`[data-weapon="${kind}"]`).click();
    if (kind !== "napalm") await page.locator("#fuse").selectOption("1");
    await page.locator("#angle").fill("90");
    await page.locator("#angle").dispatchEvent("input");
    await page.locator("#fire").dispatchEvent("pointerdown", { pointerId: 1 });
    await page.evaluate(() => window.siege.debug.advanceReplayFrames(25));
    await page.locator("#fire").dispatchEvent("pointerup", { pointerId: 1 });
    if (kind === "holy") {
      const timer = await page.evaluate(() => window.siege.getState().projectile?.nativeTimer);
      expect(timer.remaining).toBeGreaterThan(2500);
      expect(timer.remaining).toBeLessThanOrEqual(3000);
      expect(timer.delay).toBe(1800);
      expect(timer.waitForRest).toBe(1);
    }
    // Holy uses a fixed native 3 s fuse plus 1.8 s after rest; step the
    // simulation through it instead of waiting in wall time.
    await advanceUntil(page, (s, kind) => s.lastShot?.impact?.kind === kind,
      { arg: kind, max: 750, step: 5, label: `${kind} detonation` });
    expect(
      (await page.evaluate(() => window.siege.getState())).explosions,
    ).toBeGreaterThan(0);
  });
}
