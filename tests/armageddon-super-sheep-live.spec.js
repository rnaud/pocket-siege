import { test, expect } from "@playwright/test";

async function startLocalMatch(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.siege?.getState().assetsReady);
  await page.locator('[data-mode="local"]').click();
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase), { timeout: 30000 })
    .toBe("aim");
}

test("Super Sheep takes off on fire, steers 0x5B0 per held frame and explodes on contact", async ({ page }) => {
  await startLocalMatch(page);
  const flight = await page.evaluate(() => {
    const { debug } = window.siege;
    const state = () => window.siege.getState();
    const team = state().worms.findIndex((w) => w.team === state().worms[state().current].team);
    debug.spawnUnitAt("supersheep", 600);
    // spawnUnitAt owns the unit with worm 0; fire belongs to its team.
    const owner = state().worms[0].team === state().worms[state().current].team;
    debug.advanceReplayFrames(20);
    const press = (key, type = "keydown") => window.dispatchEvent(new KeyboardEvent(type, { key }));
    press(" "); press(" ", "keyup");
    const takeOff = state().projectile.sheep;
    debug.advanceReplayFrames(1);
    const straight = state().projectile.sheep;
    press("ArrowRight");
    debug.advanceReplayFrames(3);
    const steered = state().projectile.sheep;
    press("ArrowRight", "keyup");
    const sprite = state().projectile.sprite;
    let frames = 0;
    while (state().projectile && frames < 1200) { debug.advanceReplayFrames(1); frames++; }
    return { owner, team, takeOff, straight, steered, sprite, frames, after: state().projectile };
  });
  expect(flight.owner).toBe(true);
  expect(flight.takeOff.phase).toBe(1);
  expect(flight.takeOff.steering).toBe(true);
  // 004E3E40: heading 0 flies straight up at 8 px per frame.
  expect([flight.straight.vx, flight.straight.vy]).toEqual([0, -8 << 16]);
  expect(flight.steered.angle).toBe(3 * 0x5b0);
  expect(flight.steered.vx).toBeGreaterThan(0);
  expect(flight.sprite).toMatch(/^spsheep[12]$/);
  // The flight ends in a detonation well before the 20 s fuse.
  expect(flight.after).toBeNull();
  expect(flight.frames).toBeLessThan(1000);
});

test("second fire drops a flying Super Sheep and the third explodes it", async ({ page }) => {
  await startLocalMatch(page);
  const result = await page.evaluate(() => {
    const { debug } = window.siege;
    const state = () => window.siege.getState();
    debug.spawnUnitAt("supersheep", 600);
    debug.advanceReplayFrames(20);
    const fire = () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
      window.dispatchEvent(new KeyboardEvent("keyup", { key: " " }));
    };
    fire();
    debug.advanceReplayFrames(5);
    const flying = state().projectile.sheep;
    fire();
    const dropped = state().projectile.sheep;
    const sprite = state().projectile.sprite;
    debug.advanceReplayFrames(2);
    fire();
    debug.advanceReplayFrames(2);
    return { flying, dropped, sprite, after: state().projectile };
  });
  expect(result.flying.phase).toBe(1);
  // 004E4170: a third of the flight velocity, back on the walking art.
  expect(result.dropped.phase).toBe(2);
  expect(result.dropped.steering).toBe(false);
  expect(result.dropped.vy).toBe(Math.trunc((-8 << 16) / 3));
  expect(result.sprite).toBe("sheepwlk");
  expect(result.after).toBeNull();
});
