import { test, expect } from "@playwright/test";
import { fastForward } from "./helpers/misc-fast-forward.js";
import { stepNativeHurtFlight, attachNativeDrowningFlight, stepNativeDrowningFlight } from "../src/armageddon/hurt-flight.js";
import drowning from './fixtures/armageddon/drowning-flight.json' with { type: 'json' };

test("native hurt flight recovers on ground and drowning follows original underwater trajectories", { tag: "@logic" }, () => {
  const worm = {
    x: 100,
    y: 300,
    vx: 0,
    vy: -600,
    facing: 1,
    team: 0,
    hp: 100,
    originalHurt: { state: 0x80, angle: 0 },
  };
  let recovery;
  for (let frame = 0; frame < 150; frame++) {
    const result = stepNativeHurtFlight(
      worm,
      { height: 650, waterLevel: 0, frame },
      (x, y) => (y < 100 ? 1 : 0),
    );
    if (result.body.state === 0x76) {
      recovery = result;
      break;
    }
  }
  expect(recovery).toBeTruthy();
  expect(recovery.body.field250).toBe(1);
  expect(recovery.body.type).toBe(3);
  expect(recovery.body.field154).toBe(0);
  expect(recovery.body.vx).toBe(0);
  expect(recovery.body.vy).toBe(0);
  // Native y-down sweep stops one fixed unit before blocked pixel 551.
  expect(worm.y).toBe(650 - (551 * 65536 - 1) / 65536);
  expect(recovery.events).toContainEqual(
    expect.objectContaining({ operation: "state", target: 0x76 }),
  );
  for (const row of drowning.cases) {
    const submerged = { nativeDrowningBody: { ...row.initial } };
    for (const tick of row.trajectory) {
      expect(stepNativeDrowningFlight(submerged, {
        height: 650, waterLevel: 44, frame: tick.frame,
      })).toBe(tick.alive);
      expect(submerged.nativeDrowningBody).toEqual(tick.body);
    }
  }
  const frozen = { x: 200, y: 32, vx: 150, vy: -100, facing: 1, frozen: true, hp: 100 };
  const wet = attachNativeDrowningFlight(frozen, 650);
  expect(wet).toMatchObject({ state: 0x87, flags: 0x400000, complex: 1,
    vx: 3 * 65536, vy: 2 * 65536, constrained: 0 });
  expect(frozen.x).toBe(200);
  expect(frozen.y).toBe(32);
});

test("live hard landing plays native recovery and returns to idle", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.evaluate(() => window.siege.debug.dropWormForRecovery(0));
  // Step the fall faster than real time while still rendering each frame so
  // the render-derived recovery sprite (wtwang) stays observable.
  const { samples } = await fastForward(
    page,
    (s) => {
      const w = s.worms[0];
      window.__hurtRecovering ||= w.recovering;
      return window.__hurtRecovering && !w.recovering && w.nativeHurtState === null && w.ground && !w.knocked;
    },
    { perFrame: 2, sample: (s) => ({ sprite: s.worms[0].originalSprite, recovering: s.worms[0].recovering }) },
  );
  expect(samples.some((x) => x.recovering)).toBe(true);
  expect(samples.map((x) => x.sprite)).toContain("wtwang");
  await expect(page.locator("#fire")).toBeEnabled();
  await expect(page.locator("#angle")).toBeEnabled();
  expect(errors).toEqual([]);
});
