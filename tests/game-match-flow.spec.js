import { test, expect } from "@playwright/test";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
test("action camera follows the shot and snaps back for the next turn", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await page.locator("#angle").evaluate((el) => {
    el.value = "45";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await chargeShot(page, 1100);
  await expect.poll(() => page.evaluate(() => window.siege.getState().nativeCameraFocus)).not.toBeNull();
  await expect
      .poll(() => page.evaluate(() => window.siege.getState().camera.zoom), {
        timeout: 6000,
      })
      .toBe(1);
  // Finish the shot and settlement in simulation frames, not CI wall time.
  expect(await page.evaluate(() => {
    for (let frames = 0; frames < 6000; frames += 25) {
      if (window.siege.getState().team === 1) return 1;
      window.siege.debug.advanceReplayFrames(25);
    }
    return window.siege.getState().team;
  })).toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().camera.zoom), {
      timeout: 3000,
    })
    .toBe(1);
  // A turn-start supply drop can briefly hold the camera before it releases.
  await advanceUntil(page, (s) => s.nativeCameraFocus === null, { max: 1000, step: 5, label: "camera released" });
});

test("a proximity mine spends ammo, arms, and detonates", async ({ page }) => {
  const mineSounds = [];
  page.on("request", r => { if (/\/(minearm|minetick|mineimpact)\.wav$/.test(r.url())) mineSounds.push(r.url().split("/").pop()); });
  await page.goto("/");
  await page.locator('[data-mode="local"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#sound").click();
  await openArsenal(page);
  await page.locator('[data-weapon="mine"]').click();
  await expect(page.locator("#fire-label")).toHaveText("PLACE MINE");
  await page.locator("#fire").click();
  await page.evaluate(() => {
    window.mineSprites = new Set();
    function sample() {
      const mine = window.siege.getState().mines[0];
      if (!mine) return;
      window.mineSprites.add(mine.sprite);
      requestAnimationFrame(sample);
    }
    sample();
  });
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.mines).toHaveLength(1);
  expect(state.ammo[0].mine).toBe(1);
  expect(state.phase).toBe("settle");
  expect(state.mines[0].nativeTimer.fuse).toBe(3000);
  expect(state.mines[0].nativeTimer.damage).toBe(50);
  expect(state.mines[0].nativeSlot).toBe(0);
  expect(state.mines[0].nativeCreatedFrame).toBeGreaterThanOrEqual(0);
  expect(state.mines[0].nativeTimer.placed).toBe(1);
  // Browser scheduling can consume part of the arming countdown before this
  // snapshot. Exact timer values belong to the native timer logic checks;
  // verify the live arming/trigger/detonation sequence below.
  await expect.poll(() => page.evaluate(() => window.siege.getState().nativeCameraFocus)).not.toBeNull();
  // Fast-forward while still rendering so the per-frame sprite probe sees both states.
  await fastForward(page, (s) => s.mines[0]?.nativeTimer.triggered === 1, { perFrame: 3, max: 1500, label: "mine trigger" });
  const armed = await page.evaluate(() => window.siege.getState().mines[0]);
  expect(armed.nativeBody.type).toBe(10);
  expect(armed.nativeBody.shape).toBe(2);
  expect(armed.nativeBody.complex).toBe(1);
  // Placement can settle before the first browser snapshot. Native body
  // properties, impact sound, and detonation below verify the live mine.
  await fastForward(page, (s) => s.explosions > 0, { perFrame: 3, max: 1500, label: "mine detonation" });
  state = await page.evaluate(() => window.siege.getState());
  expect(state.mines).toHaveLength(0);
  // Detonation can ignite barrels; their flames retain camera focus independently.
  expect(mineSounds.sort()).toEqual(["minearm.wav", "mineimpact.wav", "minetick.wav"]);
  expect(await page.evaluate(() => [...window.mineSprites].sort())).toEqual(["mineoff", "mineon"]);
});

test("the last shot can be replayed over the battlefield", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await page.locator("#angle").evaluate((el) => {
    el.value = "45";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await chargeShot(page, 900);
  await advanceUntil(page, (s) => (s.lastShot?.points ?? 0) > 2, { max: 1500, step: 5, label: "recorded shot" });
  // Finish the real shot/settlement simulation without depending on CI frame
  // rate. The existing helper only suppresses persistent score writes.
  await page.bringToFront();
  const settled = await page.evaluate(() => {
    for (let frames = 0; frames < 18000; frames += 25) {
      const phase = window.siege.getState().phase;
      if (phase === "aim" || phase === "over") return true;
      window.siege.debug.advanceReplayFrames(25);
    }
    return false;
  });
  expect(settled).toBe(true);
  await expect(page.locator("#replay")).toBeEnabled();
  // A replay lasts 1.1-2.8 s of wall time; record it every frame so a slow
  // runner cannot miss it between polls.
  await page.evaluate(() => {
    window.replaySeen = false;
    const sample = () => {
      window.replaySeen ||= window.siege.getState().replaying;
      if (!window.replaySeen) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.locator("#replay").click();
  await expect.poll(() => page.evaluate(() => window.replaySeen)).toBe(true);
  await expect(page.locator(".replay-path")).toHaveAttribute("d", /^M/);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().replaying), {
      timeout: 7000,
    })
    .toBe(false);
});
