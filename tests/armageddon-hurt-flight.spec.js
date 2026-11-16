import { test, expect } from "@playwright/test";
import { stepNativeHurtFlight } from "../src/armageddon/hurt-flight.js";

test("native hurt flight reaches steep-fall recovery on a flat floor", () => {
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
  expect(recovery.body.vx).toBe(0);
  expect(recovery.body.vy).toBe(0);
  // Native y-down sweep stops one fixed unit before blocked pixel 551.
  expect(worm.y).toBe(650 - (551 * 65536 - 1) / 65536);
  expect(recovery.events).toContainEqual(
    expect.objectContaining({ operation: "state", target: 0x76 }),
  );
});

test("live hard landing plays native recovery and returns to idle", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.evaluate(() => {
    window.hurtProbe = { names: [], recovering: false, done: false };
    window.siege.debug.dropWormForRecovery(0);
    const sample = () => {
      const w = window.siege.getState().worms[0],
        p = window.hurtProbe;
      if (!p.names.includes(w.originalSprite)) p.names.push(w.originalSprite);
      p.recovering ||= w.recovering;
      p.done =
        p.recovering &&
        !w.recovering &&
        w.nativeHurtState === null &&
        w.ground &&
        !w.knocked;
      if (!p.done) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await expect
    .poll(() => page.evaluate(() => window.hurtProbe.done), { timeout: 10000 })
    .toBe(true);
  expect(await page.evaluate(() => window.hurtProbe.names)).toContain("wtwang");
  await expect(page.locator("#fire")).toBeEnabled();
  await expect(page.locator("#angle")).toBeEnabled();
  expect(errors).toEqual([]);
});
